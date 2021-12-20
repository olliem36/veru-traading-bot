import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import BinanceService from './binance.service';
import MarketWatchService from './market-watch.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MarketWatchService, BinanceService],
})
export class AppModule {}
