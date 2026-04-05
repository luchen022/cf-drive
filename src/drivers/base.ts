// Driver 接口定义

export type { Driver, DriverConfig, SchemaField } from "../types";
export type DriverConstructor = new () => Driver;
export type DriverRegistry = Map<string, DriverConstructor>;
