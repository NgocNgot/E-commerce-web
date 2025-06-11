import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicketSimple } from '@fortawesome/free-solid-svg-icons';

interface VoucherSectionProps {
    voucherCode: string;
    selectedVoucher: any;
    handleVoucherInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleApplyVoucher: () => void;
    formatCurrency: (amount: number | undefined | null) => string;
}

const VoucherSection: React.FC<VoucherSectionProps> = ({
    voucherCode,
    selectedVoucher,
    handleVoucherInputChange,
    handleApplyVoucher,
    formatCurrency,
}) => {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center relative">
                Voucher
                {selectedVoucher && (
                    <div className="relative ml-4 flex items-center justify-center w-6 h-6 text-white font-semibold text-xs">
                        <FontAwesomeIcon
                            icon={faTicketSimple}
                            size="2x"
                            color="oklch(64.5% 0.246 16.439)"
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        />
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-white">
                            {selectedVoucher?.discountType === "percentage" && `-${selectedVoucher.percentage}%`}
                            {selectedVoucher?.discountType === "fixedAmount" && `-${formatCurrency(selectedVoucher.discountValue)}`}
                        </span>
                    </div>
                )}
            </h2>
            <div className="mb-4 flex">
                <input
                    type="text"
                    id="voucherCode"
                    className="w-full p-3 border rounded-xl"
                    value={voucherCode}
                    onChange={handleVoucherInputChange}
                />
                <button
                    onClick={handleApplyVoucher}
                    className="bg-rose-400 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-full w-40 ml-2"
                >
                    APPLY
                </button>
            </div>
        </div>
    );
};

export default VoucherSection;