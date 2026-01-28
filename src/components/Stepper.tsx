import React, { useState, useRef, useEffect } from 'react';

interface StepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    price?: number;
    allowManualInput?: boolean; // Разрешить ручной ввод
}

export default function Stepper({
    value,
    onChange,
    min = 0,
    max = 99,
    step = 1,
    label,
    price,
    allowManualInput = true // По умолчанию разрешён
}: StepperProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    // Синхронизация inputValue с внешним value
    useEffect(() => {
        if (!isEditing) {
            setInputValue(String(value));
        }
    }, [value, isEditing]);

    // Автофокус на поле ввода
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

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

    const handleValueClick = () => {
        if (allowManualInput) {
            setIsEditing(true);
            setInputValue(String(value));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        commitValue();
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            commitValue();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setInputValue(String(value));
        }
    };

    const commitValue = () => {
        setIsEditing(false);
        const parsed = parseFloat(inputValue.replace(',', '.'));

        if (isNaN(parsed)) {
            setInputValue(String(value));
            return;
        }

        // Ограничиваем значение в пределах min-max
        const clamped = Math.max(min, Math.min(max, parsed));
        // Округляем до шага
        const rounded = Math.round(clamped / step) * step;
        const final = Number(rounded.toFixed(1));

        onChange(final);
        setInputValue(String(final));
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

                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        className="stepper-input"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                    />
                ) : (
                    <div
                        className={`stepper-value ${allowManualInput ? 'stepper-value--clickable' : ''}`}
                        onClick={handleValueClick}
                        title={allowManualInput ? 'Нажмите для ручного ввода' : undefined}
                    >
                        {value}
                    </div>
                )}

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
