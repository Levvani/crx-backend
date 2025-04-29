import { Document } from 'mongoose';
export type CarDocument = Car & Document;
export declare class Car {
    carID: number;
    username: string;
    vinCode: string;
    brand: string;
    model: string;
    year: number;
    km: number;
    lotNumber: string;
    auctionName: string;
    dateOfPurchase: Date;
    dateOfAuctionPayment: Date;
    dateOfStorageDelivery: Date;
    dateOfReceivingDocs: Date;
    sender: string;
    receiver: string;
    comment: string;
    shippingLine: string;
    dateOfContainerArrival: Date;
    dateOfContainerOpening: Date;
    greenDate: Date;
    buyer: string;
    buyerPN: string;
    buyerPhone: string;
    auctionPrice: number;
    amountToPay: number;
    totalAmountPaid: number;
    containerNumber: string;
    createdAt: Date;
    photos: string[];
    status: string;
    hybridElectric: boolean;
    offsite: boolean;
    fine: number;
    toBeFinanced: number;
}
export declare const CarSchema: import("mongoose").Schema<Car, import("mongoose").Model<Car, any, any, any, Document<unknown, any, Car, any> & Car & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Car, Document<unknown, {}, import("mongoose").FlatRecord<Car>, {}> & import("mongoose").FlatRecord<Car> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
