import React from 'react';

interface StepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    price?: number;
}

export default function Stepper({
    value,
    onChange,
    min = 0,
    max = 99,
    step = 1,
    label,
    price
}: StepperProps) {

    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        const newValue = Math.max(min, Number((value - step).toFixed(1)));
        onChange(newValue);
    };

    const handleIncrement = (e: React.MouseEvent) => {
        e.preventDefault();
        const newValue = Math.min(max, Number((value + step).toFixed(1)));
        onChange(newValue);
    };

    return (
        <div className="stepper-container">
            {label && (
                <div className="stepper-header">
                    <span className="stepper-label">{label}</span>
                    {price !== undefined && (
                        <span className="stepper-price">
                            {price}₽
                        </span>
                    )}
                </div>
            )}

            <div className="stepper-controls">
                <button
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="stepper-btn stepper-btn--minus"
                    type="button"
                >
                    −
                </button>

                <div className="stepper-value">
                    {value}
                </div>

                <button
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="stepper-btn stepper-btn--plus"
                    type="button"
                >
                    +
                </button>
            </div>
        </div>
    );
}
