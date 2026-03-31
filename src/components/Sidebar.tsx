import React, { useEffect } from 'react';
import { Shield, MapPin, Mail, Send, Calculator, Zap } from 'lucide-react';
import { PlannerConfig } from '../types';

interface Props {
  config: PlannerConfig;
  setConfig: (config: PlannerConfig) => void;
  emails: string[];
  setEmails: (emails: string[]) => void;
  onCalculate: () => void;
  onSend: () => void;
  onSimulate: () => void;
  isSimulating: boolean;
}

export default function Sidebar({ config, setConfig, emails, setEmails, onCalculate, onSend, onSimulate, isSimulating }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: name === 'city' || name === 'interceptorType' || name === 'threatType' || name === 'formationShape' ? value : Number(value)
    });
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
    localStorage.setItem("truckEmails", JSON.stringify(newEmails));
  };

  // Adjust emails array when truckCount changes
  useEffect(() => {
    if (emails.length !== config.truckCount) {
      const newEmails = [...emails];
      if (config.truckCount > emails.length) {
        for (let i = emails.length; i < config.truckCount; i++) {
          newEmails.push('');
        }
      } else {
        newEmails.splice(config.truckCount);
      }
      setEmails(newEmails);
    }
  }, [config.truckCount]);

  return (
    <div className="w-80 h-full custom-panel flex flex-col border-r border-white/10 p-6 z-10 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-accent rounded flex items-center justify-center shadow-[0_0_15px_rgba(242,125,38,0.4)]">
          <Shield className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tighter uppercase italic">Otaman</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none">Планувальник v2.0</p>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <section>
          <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Місто</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
            <input
              type="text"
              name="city"
              value={config.city}
              onChange={handleChange}
              placeholder="Введіть місто..."
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </section>

        <section>
          <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Тип загрози</label>
          <select
            name="threatType"
            value={config.threatType}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="fpv">FPV (120 км/год)</option>
            <option value="shahed">Shahed (180 км/год)</option>
            <option value="cruise">Крилата ракета (850 км/год)</option>
            <option value="ballistic">Балістична (5000 км/год)</option>
          </select>
        </section>

        <section>
          <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Форма рою</label>
          <select
            name="formationShape"
            value={config.formationShape}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="plane">Стіна (Plane)</option>
            <option value="sphere">Сфера (Sphere)</option>
            <option value="cone">Конус (Cone)</option>
            <option value="v-shape">V-подібна (V-shape)</option>
            <option value="grid">Сітка (Grid)</option>
            <option value="cylinder">Циліндр (Cylinder)</option>
            <option value="ring">Кільце (Ring)</option>
          </select>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section>
            <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Дист. виявл. (км)</label>
            <input
              type="number"
              name="detectionDistance"
              value={config.detectionDistance}
              onChange={handleChange}
              min="10"
              max="500"
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent"
            />
          </section>
          <section>
            <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Час запуску (сек)</label>
            <input
              type="number"
              name="launchTime"
              value={config.launchTime}
              onChange={handleChange}
              min="5"
              max="120"
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent"
            />
          </section>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <section>
            <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Дронів/Машину</label>
            <input
              type="number"
              name="dronesPerVehicle"
              value={config.dronesPerVehicle}
              onChange={handleChange}
              min="1"
              max="100"
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent"
            />
          </section>
          <section>
            <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">К-ть машин</label>
            <input
              type="number"
              name="truckCount"
              value={config.truckCount}
              onChange={handleChange}
              min="1"
              max="20"
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent"
            />
          </section>
        </div>

        <section>
          <label className="text-[10px] font-mono uppercase text-white/40 mb-2 block tracking-widest">Тип перехоплювача</label>
          <select
            name="interceptorType"
            value={config.interceptorType}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="P1-Sun">P1-Sun (400 км/год | 20 км)</option>
            <option value="Saliut">Saliut (320 км/год | 15 км)</option>
            <option value="FPV interceptor">FPV interceptor (150 км/год | 8 км)</option>
          </select>
        </section>

        <section>
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-mono uppercase text-white/40 block tracking-widest">Радіус (м)</label>
            <span className="text-[10px] font-mono text-accent">{config.radius}м</span>
          </div>
          <input
            type="range"
            name="radius"
            value={config.radius}
            onChange={handleChange}
            min="5000"
            max="50000"
            step="1000"
            className="w-full accent-accent"
          />
        </section>

        <section className="space-y-3">
          <label className="text-[10px] font-mono uppercase text-white/40 block tracking-widest">Email водіїв</label>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {emails.map((email, index) => (
              <div key={index} className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  placeholder={`Водій #${index + 1}`}
                  className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="pt-4 space-y-3">
          <button
            onClick={onCalculate}
            className="w-full bg-white text-black font-bold py-3 rounded-md flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all active:scale-95"
          >
            <Calculator className="w-4 h-4" />
            РОЗРАХУВАТИ
          </button>

          <button
            onClick={onSimulate}
            className={`w-full border font-bold py-3 rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isSimulating 
                ? 'bg-red-500/20 border-red-500 text-red-500' 
                : 'border-white/20 text-white hover:bg-white/10'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSimulating ? 'fill-current' : ''}`} />
            {isSimulating ? 'ЗУПИНИТИ СИМУЛЯЦІЮ' : 'ЗАПУСТИТИ СИМУЛЯЦІЮ'}
          </button>
          
          <button
            onClick={onSend}
            className="w-full border border-white/20 text-white font-bold py-3 rounded-md flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            НАДІСЛАТИ КООРДИНАТИ
          </button>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between text-[10px] font-mono text-white/20 uppercase tracking-widest">
          <span>Статус</span>
          <span className="text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Готово
          </span>
        </div>
      </div>
    </div>
  );
}
