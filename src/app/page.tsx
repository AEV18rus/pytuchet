export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Путёвой учёт
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Система учета рабочих смен
          </h2>
          <p className="text-gray-600 mb-4">
            Добро пожаловать в систему учета рабочих смен. 
            Приложение успешно развернуто на Vercel!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Функции:</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Учет рабочих смен</li>
                <li>• Расчет заработной платы</li>
                <li>• Управление ценами</li>
                <li>• Отчеты и статистика</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Статус:</h3>
              <div className="text-green-700 text-sm space-y-1">
                <div>✅ Приложение запущено</div>
                <div>✅ Next.js 16 работает</div>
                <div>✅ Vercel деплой успешен</div>
                <div>✅ API маршруты готовы</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <a 
            href="/api/hello" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Тест API
          </a>
        </div>
      </div>
    </div>
  );
}
