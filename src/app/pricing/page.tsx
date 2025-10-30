'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Prices {
  hourly_rate: number;
  steam_bath_price: number;
  brand_steam_price: number;
  intro_steam_price: number;
  scrubbing_price: number;
  zaparnik_price: number;
}

export default function PricingPage() {
  const [prices, setPrices] = useState<Prices>({
    hourly_rate: 0,
    steam_bath_price: 0,
    brand_steam_price: 0,
    intro_steam_price: 0,
    scrubbing_price: 0,
    zaparnik_price: 0
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Загрузка цен при открытии страницы
  const loadPrices = async () => {
    try {
      const response = await fetch('/api/prices/bulk');
      if (response.ok) {
        const pricesData = await response.json();
        setPrices(pricesData);
      }
    } catch (error) {
      console.error('Ошибка при загрузке цен:', error);
    }
  };

  // Сохранение цен
  const savePrices = async () => {
    try {
      const response = await fetch('/api/prices/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prices)
      });

      if (response.ok) {
        setShowSuccess(true);
        
        // Перейти на добавление новой смены (главная страница) через 1 секунду
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        const errorData = await response.json();
        alert(`Ошибка при сохранении цен: ${errorData.error || 'Попробуйте еще раз.'}`);
      }
    } catch (error) {
      console.error('Ошибка при сохранении цен:', error);
      alert('Ошибка при сохранении цен. Попробуйте еще раз.');
    }
  };

  const handleInputChange = (field: keyof Prices, value: string) => {
    setPrices(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  useEffect(() => {
    loadPrices();
  }, []);

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary-color: #4A2B1B;
          --secondary-color: #7A3E2D;
          --accent-color: #E9D5B5;
          --background-main: #F2E5D3;
          --font-color: #2C1A0F;
          --primary-light: #5D3426;
          --primary-dark: #3A2015;
          --secondary-light: #8B4A38;
          --secondary-dark: #6A3424;
          --accent-light: #F0E2C8;
          --accent-dark: #DCC49F;
          --background-card: #FEFCF8;
          --background-section: rgba(233, 213, 181, 0.15);
          --shadow-light: rgba(74, 43, 27, 0.1);
          --shadow-medium: rgba(74, 43, 27, 0.15);
          --border-light: rgba(74, 43, 27, 0.2);
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%);
          min-height: 100vh;
          padding: 20px;
          color: var(--font-color);
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 30px;
          text-align: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          flex-wrap: nowrap;
        }

        .logo {
          width: 120px;
          height: 120px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-text {
          text-align: left;
        }

        .header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .content {
          padding: 30px;
        }

        .pricing-form {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          border: 2px solid var(--primary-color);
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .pricing-form::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .pricing-form h2 {
          color: var(--primary-color);
          margin-bottom: 25px;
          font-size: 1.6em;
          font-weight: 700;
          text-shadow: 0 1px 2px var(--shadow-light);
        }

        .price-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 15px;
          background: var(--background-card);
          border-radius: 10px;
          box-shadow: 0 2px 4px var(--shadow-light);
          border: 2px solid var(--border-light);
          transition: all 0.3s ease;
        }

        .price-item:hover {
          box-shadow: 0 4px 8px var(--shadow-light);
          border-color: var(--primary-light);
        }

        .price-label {
          font-weight: 600;
          color: var(--font-color);
          flex: 1;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .price-input {
          width: 120px;
          padding: 14px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 16px;
          text-align: right;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
        }

        .price-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium);
          transform: translateY(-1px);
        }

        .price-input:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 8px var(--shadow-light);
        }

        .currency {
          margin-left: 8px;
          color: var(--primary-color);
          font-weight: 600;
        }

        .btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px var(--shadow-medium);
          margin-top: 20px;
        }

        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4);
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        .btn:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px var(--shadow-medium);
        }

        .success-message {
          background: linear-gradient(135deg, var(--accent-light) 0%, var(--accent-color) 100%);
          color: var(--primary-color);
          padding: 16px;
          border-radius: 10px;
          margin-top: 20px;
          text-align: center;
          border: 2px solid var(--primary-color);
          box-shadow: 0 4px 15px var(--shadow-light);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .container {
            margin: 10px;
            border-radius: 15px;
            padding: 10px;
            max-width: 100%;
          }

          .header {
            padding: 20px;
          }

          .header-content {
            flex-direction: column;
            gap: 10px;
          }

          .logo {
            width: 100px;
            height: 100px;
          }

          .header-text {
            text-align: center;
          }

          .header h1 {
            font-size: 24px;
          }

          .header p {
            font-size: 14px;
          }

          .content {
            padding: 20px;
          }

          .pricing-form {
            padding: 20px;
          }

          .price-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .price-label {
            font-size: 14px;
          }

          .price-input {
            width: 100%;
            font-size: 16px;
            padding: 12px;
            min-height: 44px;
          }

          .btn {
            font-size: 16px;
            padding: 12px 20px;
            min-height: 44px;
            width: 100%;
            margin-bottom: 10px;
          }

          .success-message {
            font-size: 14px;
            padding: 10px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image 
                src="/logo.svg" 
                alt="Логотип" 
                width={120} 
                height={120}
                priority
              />
            </div>
            <div className="header-text">
              <h1>Путевый Учет</h1>
              <p>Управление ценами на услуги</p>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="pricing-form">
            <h2>Цены на услуги</h2>
            
            <div className="price-item">
              <label className="price-label" htmlFor="hourlyRate">Цена часа:</label>
              <div>
                <input
                  type="number"
                  id="hourlyRate"
                  className="price-input"
                  value={prices.hourly_rate}
                  min="0"
                  step="50"
                  onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <div className="price-item">
              <label className="price-label" htmlFor="steamBathPrice">Путевое парение:</label>
              <div>
                <input
                  type="number"
                  id="steamBathPrice"
                  className="price-input"
                  value={prices.steam_bath_price}
                  min="0"
                  step="100"
                  onChange={(e) => handleInputChange('steam_bath_price', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <div className="price-item">
              <label className="price-label" htmlFor="brandSteamPrice">Фирменное парение:</label>
              <div>
                <input
                  type="number"
                  id="brandSteamPrice"
                  className="price-input"
                  value={prices.brand_steam_price}
                  min="0"
                  step="100"
                  onChange={(e) => handleInputChange('brand_steam_price', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <div className="price-item">
              <label className="price-label" htmlFor="introSteamPrice">Ознакомительное парение:</label>
              <div>
                <input
                  type="number"
                  id="introSteamPrice"
                  className="price-input"
                  value={prices.intro_steam_price}
                  min="0"
                  step="100"
                  onChange={(e) => handleInputChange('intro_steam_price', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <div className="price-item">
              <label className="price-label" htmlFor="scrubbingPrice">Скрабирование:</label>
              <div>
                <input
                  type="number"
                  id="scrubbingPrice"
                  className="price-input"
                  value={prices.scrubbing_price}
                  min="0"
                  step="50"
                  onChange={(e) => handleInputChange('scrubbing_price', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <div className="price-item">
              <label className="price-label" htmlFor="zaparnikPrice">Запарник:</label>
              <div>
                <input
                  type="number"
                  id="zaparnikPrice"
                  className="price-input"
                  value={prices.zaparnik_price}
                  min="0"
                  step="50"
                  onChange={(e) => handleInputChange('zaparnik_price', e.target.value)}
                />
                <span className="currency">₽</span>
              </div>
            </div>

            <button type="button" className="btn" onClick={savePrices}>
              Сохранить
            </button>

            {showSuccess && (
              <div className="success-message">
                Цены успешно сохранены!
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}