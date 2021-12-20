# "Veru" BTC USDT Trading Bot

A "just for fun" trading bot made over the weekend when staying with family.

## Description

Binance BTC USDT trading bot made in [Nest](https://github.com/nestjs/nest) framework TypeScript.

The bot looks to buy small dips in price and can accurately (89.9%) buy before a price increase.

Although the bot can predict a price rise with high accuracy when making a trade (Which is what I got hyped about!) the exchange fees murdered it and I can't backtest the bot to make a profit.

Add the following keys to .env.local to have a play

BINANCE_API_KEY=
BINANCE_API_SECRET=

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
