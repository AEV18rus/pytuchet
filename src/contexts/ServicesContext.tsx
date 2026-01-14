'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/auth';

export interface Price {
  id?: number;
  name: string;
  price: number;
}

interface ServicesContextType {
  prices: Price[];
  loading: boolean;
  error: string | null;
  refreshPrices: () => Promise<void>;
  addPrice: (price: Omit<Price, 'id'>) => Promise<void>;
  updatePrice: (id: number, price: Omit<Price, 'id'>) => Promise<void>;
  deletePrice: (id: number) => Promise<void>;
  getPrice: (name: string) => number;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

interface ServicesProviderProps {
  children: React.ReactNode;
}

export const ServicesProvider: React.FC<ServicesProviderProps> = ({ children }) => {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для получения цены по названию
  const getPrice = useCallback((name: string): number => {
    const price = prices.find(p => p.name === name);
    return price ? price.price : 0;
  }, [prices]);

  // Функция для загрузки цен
  const refreshPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/prices');
      if (!response.ok) {
        throw new Error(`Ошибка загрузки цен: ${response.status}`);
      }

      const data = await response.json();
      setPrices(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Ошибка при загрузке цен:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Функция для добавления новой цены
  const addPrice = useCallback(async (newPrice: Omit<Price, 'id'>) => {
    try {
      setError(null);

      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newPrice),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка добавления услуги: ${response.status}`);
      }

      // Обновляем локальное состояние сразу после успешного добавления
      await refreshPrices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Ошибка при добавлении цены:', err);
      throw err;
    }
  }, [refreshPrices]);

  // Функция для обновления цены
  const updatePrice = useCallback(async (id: number, updatedPrice: Omit<Price, 'id'>) => {
    try {
      setError(null);

      const response = await fetch(`/api/prices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedPrice),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка обновления услуги: ${response.status}`);
      }

      // Обновляем локальное состояние сразу после успешного обновления
      await refreshPrices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Ошибка при обновлении цены:', err);
      throw err;
    }
  }, [refreshPrices]);

  // Функция для удаления цены
  const deletePrice = useCallback(async (id: number) => {
    try {
      setError(null);

      const response = await fetch(`/api/prices?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка удаления услуги: ${response.status}`);
      }

      // Обновляем локальное состояние сразу после успешного удаления
      await refreshPrices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      console.error('Ошибка при удалении цены:', err);
      throw err;
    }
  }, [refreshPrices]);

  // Загружаем цены при инициализации
  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  const value: ServicesContextType = {
    prices,
    loading,
    error,
    refreshPrices,
    addPrice,
    updatePrice,
    deletePrice,
    getPrice,
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};