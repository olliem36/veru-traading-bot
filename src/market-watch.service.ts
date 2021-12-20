import { Injectable } from "@nestjs/common";
import BinanceService from "./binance.service";

@Injectable()
export default class MarketWatchService {

    onModuleInit() {
        console.log(`The module has been initialized.`);
        this.bootstrap()
    }

    constructor(
        private readonly binanceService: BinanceService,
    ) {

    }

    bootstrap() {
        this.binanceService.backTest()
    }
}