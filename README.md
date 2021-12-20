# "Veru" BTC USDT Trading Bot

A "just for fun" trading bot made over the weekend when staying with family.

## Description

Binance BTC USDT trading bot made in [Nest](https://github.com/nestjs/nest) framework TypeScript.

The bot looks to buy small dips in price and can accurately (89.9%) buy before a price increase.

Although the bot can predict a price rise with high accuracy when making a trade (Which is what I got hyped about!) the exchange fees murdered it and I can't backtest the bot to make a profit.

Add the following keys to .env.local to have a play

BINANCE_API_KEY=
BINANCE_API_SECRET=

Note: It uses back testing, so you can play with an empty binance account :)

## Usage

Most the scrip is in `binance.service.ts`, you can change the key values here:

```
const VeruBehaviour: IVeruBehaviour = {
    TREND_SAMPLE_FREQUENCY_SECONDS: 5, // * 60,
    TREND_TO_BUY: ['down', 'down', 'up'],

    BET_SIZE_BTC: 0.001,

    // When to sell
    STOP_LOSS_PERCENTAGE: 0.05,
    STOP_LOSS_AGE_MINS: 60 * 3,

    // USD
    MINIMUM_PROFIT: 0.5
    ,
    // Environment settings

    ENV_TYPICAL_SPREAD: 0.000001,
    ENV_TAKER_FEE_PERCENT: 0.00075,

    ENV_INFO_LOG: false,

    ENV_SIMULATION_AGE_DAYS: 1,
    ENV_SIMULATION_LENGTH_DAYS: 3,
}
```

ENV_SIMULATION_AGE_DAYS is how long in the past you should start collecting test data and ENV_SIMULATION_LENGTH_DAYS is how long you should run the bot for/

## Installation

```bash
$ npm install
```



## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
