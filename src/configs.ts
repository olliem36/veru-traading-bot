
interface IConfigs {
    readonly BINANCE_API_KEY: string
    readonly BINANCE_API_SECRET: string
}

const Configs: IConfigs = {
    BINANCE_API_KEY: process.env.BINANCE_API_KEY,
    BINANCE_API_SECRET: process.env.BINANCE_API_SECRET
}

export default Configs
