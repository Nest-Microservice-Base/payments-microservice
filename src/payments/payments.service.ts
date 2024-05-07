import { Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICE, envs } from 'src/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  // Logger Class
  private readonly logger = new Logger('PaymentsService');
  // Configuration stripe payment
  private readonly stripe = new Stripe(envs.stripeSecret);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  // method create session payment in stripe
  async createPaymentSession(createPaymentSessionDto: CreatePaymentSessionDto) {
    const { currency, items, orderId } = createPaymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency, // money
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // 20 dollars = 2000  (2000/100 = 20.00 )
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      // Colocar el id de la orden
      payment_intent_data: {
        metadata: {
          orderId: orderId,
        },
      },

      // Information buys items
      line_items: lineItems,

      // type transaction
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });

    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url,
    };
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    // Testing
    // const endpointSecret = 'whsec_f506ef2b9b0fb3cc60ea59d64a0914099030d9caafda235d450568d06334d782';

    // Real
    const endpointSecret = envs.stripeEndpointSecret;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceeded = event.data.object;
        // TODO: llamar nuestro microservicio

        const payload = {
          stripePaymentId: chargeSucceeded.id,
          orderId: chargeSucceeded.metadata.orderId,
          receiptUrl: chargeSucceeded.receipt_url,
        };

        //this.logger.log({ payload });

        // emit: no espera una respuesta
        this.client.emit('payment.succeedded', payload);

        break;

      default:
        console.log(`Event ${event.type} not handled`);
    }

    return res.status(200).json({ sig });
  }
}
