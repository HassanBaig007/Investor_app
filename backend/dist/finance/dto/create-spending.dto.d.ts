declare class PaidToDto {
    person: string;
    place: string;
}
export declare class CreateSpendingDto {
    amount: number;
    description: string;
    category: string;
    projectId: string;
    date?: string;
    paidTo?: PaidToDto;
    materialType?: string;
    productName?: string;
    ledgerId?: string;
    subLedger?: string;
    fundedBy?: string;
    investmentType?: string;
}
export {};
