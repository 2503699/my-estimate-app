import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Printer, Calculator, Settings, Save, Database, ArrowLeft, Edit2, Check } from 'lucide-react';

const App = () => {
  // --- 狀態管理 ---
  const [view, setView] = useState('estimate'); // 'estimate' 或 'manage'
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('est_current_items');
    return saved ? JSON.parse(saved) : [{ id: 1, name: '', price: 0, quantity: 1, unit: '個', subtotal: 0 }];
  });
  
  const [presetItems, setPresetItems] = useState(() => {
    const saved = localStorage.getItem('est_presets');
    const defaultPresets = [
      { id: 'p1', name: '水泥', price: 200, unit: '包' },
      { id: 'p2', name: '矽利康', price: 100, unit: '支' },
      { id: 'p3', name: '油漆粉刷', price: 150, unit: '平方米' },
      { id: 'p4', name: '拆除', price: 200, unit: '平方米' },
      { id: 'p5', name: '清運', price: 10000, unit: '公噸' }
    ];
    return saved ? JSON.parse(saved) : defaultPresets;
  });

  const [taxRate, setTaxRate] = useState(5);
  const [clientName, setClientName] = useState('');
  const [note, setNote] = useState('');

  // --- 持久化儲存 ---
  useEffect(() => {
    localStorage.setItem('est_current_items', JSON.stringify(items));
    localStorage.setItem('est_presets', JSON.stringify(presetItems));
  }, [items, presetItems]);

  // --- 計算邏輯 ---
  const totals = useMemo(() => {
    const totalWithoutTax = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const taxAmount = Math.round(totalWithoutTax * (taxRate / 100));
    const grandTotal = totalWithoutTax + taxAmount;
    return { totalWithoutTax, taxAmount, grandTotal };
  }, [items, taxRate]);

  // --- 估價單操作 ---
  const addItem = () => {
    setItems([...items, { id: Date.now(), name: '', price: 0, quantity: 1, unit: '個', subtotal: 0 }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updated = { ...item, [field]: value };
        // 如果是選擇了預設品項名稱
        if (field === 'name') {
          const preset = presetItems.find(p => p.name === value);
          if (preset) {
            updated.price = preset.price;
            updated.unit = preset.unit;
          }
        }
        updated.subtotal = updated.price * updated.quantity;
        return updated;
      }
      return item;
    }));
  };

  // --- 常用項目管理 ---
  const [newPreset, setNewPreset] = useState({ name: '', price: 0, unit: '個' });
  
  const addPreset = () => {
    if (!newPreset.name) return;
    setPresetItems([...presetItems, { ...newPreset, id: Date.now() }]);
    setNewPreset({ name: '', price: 0, unit: '個' });
  };

  const removePreset = (id) => {
    setPresetItems(presetItems.filter(p => p.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:m-0">
        
        {/* 頂部導覽 */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center print:bg-white print:text-black print:border-b">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-7 h-7 text-blue-400 print:text-black" /> 
              {view === 'estimate' ? '專業估價系統' : '管理常用品項'}
            </h1>
            <p className="text-slate-400 text-sm mt-1 print:hidden">
              {view === 'estimate' ? '快速選取品項，自動計算總額' : '在此建立您的標準報價資料庫'}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            {view === 'estimate' ? (
              <>
                <button 
                  onClick={() => setView('manage')}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
                >
                  <Database className="w-4 h-4" /> 品項庫
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition shadow-lg shadow-blue-900/20"
                >
                  <Printer className="w-4 h-4" /> 列印
                </button>
              </>
            ) : (
              <button 
                onClick={() => setView('estimate')}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" /> 返回估價
              </button>
            )}
          </div>
        </div>

        {view === 'estimate' ? (
          <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* 客戶資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">客戶 / 案場名稱</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="請輸入客戶名稱..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">營業稅率 (%)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Settings className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 品項列表 */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm">
                    <th className="py-4 px-4 font-bold border-b">品項名稱 (可選常用項)</th>
                    <th className="py-4 px-4 font-bold border-b w-24">單位</th>
                    <th className="py-4 px-4 font-bold border-b w-32">單價</th>
                    <th className="py-4 px-4 font-bold border-b w-24">數量</th>
                    <th className="py-4 px-4 font-bold border-b w-32 text-right">小計</th>
                    <th className="py-4 px-2 border-b w-12 text-center print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition group">
                      <td className="py-3 px-4">
                        <div className="relative">
                          <input 
                            list={`presets-${item.id}`}
                            type="text" 
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="輸入或選擇項目"
                            className="w-full bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-blue-500 outline-none py-1"
                          />
                          <datalist id={`presets-${item.id}`}>
                            {presetItems.map(p => <option key={p.id} value={p.name}>{p.unit} / ${p.price}</option>)}
                          </datalist>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <input 
                          type="text" 
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          className="w-full bg-transparent outline-none"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                          className="w-full bg-transparent outline-none font-medium text-slate-700"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full bg-transparent outline-none font-medium text-slate-700"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${(item.price * item.quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-center print:hidden">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={addItem}
              className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition print:hidden"
            >
              <Plus className="w-5 h-5" /> 新增報價項目
            </button>

            {/* 備註與總計 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">備註事項</label>
                <textarea 
                  rows="4"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="請輸入付款方式、工作天數或其他約定事項..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition"
                ></textarea>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-slate-600 text-sm">
                  <span>小計 (未稅金額)</span>
                  <span className="font-mono text-lg">${totals.totalWithoutTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-sm">
                  <span>營業稅 ({taxRate}%)</span>
                  <span className="font-mono text-lg">${totals.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-lg font-bold text-slate-800">總計金額 (含稅)</span>
                  <div className="text-right">
                    <div className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                      ${totals.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm flex gap-3">
              <Database className="w-5 h-5 shrink-0" />
              <p>在這裡定義常用的工程項目，估價時輸入名稱即可自動帶入單價與單位。資料將儲存在此瀏覽器中。</p>
            </div>

            {/* 新增常用項 */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-slate-700">新增常用項目</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input 
                  placeholder="品項名稱 (如：水泥)"
                  className="p-2 border rounded-lg outline-none focus:border-blue-500"
                  value={newPreset.name}
                  onChange={e => setNewPreset({...newPreset, name: e.target.value})}
                />
                <input 
                  placeholder="單位 (如：包)"
                  className="p-2 border rounded-lg outline-none focus:border-blue-500"
                  value={newPreset.unit}
                  onChange={e => setNewPreset({...newPreset, unit: e.target.value})}
                />
                <input 
                  type="number"
                  placeholder="單價"
                  className="p-2 border rounded-lg outline-none focus:border-blue-500"
                  value={newPreset.price}
                  onChange={e => setNewPreset({...newPreset, price: Number(e.target.value)})}
                />
              </div>
              <button 
                onClick={addPreset}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                儲存至資料庫
              </button>
            </div>

            {/* 常用項列表 */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 px-1">現有項目庫 ({presetItems.length})</h3>
              <div className="grid grid-cols-1 gap-2">
                {presetItems.map(preset => (
                  <div key={preset.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition group">
                    <div className="flex gap-6 items-center">
                      <div className="font-bold text-slate-800 min-w-[100px]">{preset.name}</div>
                      <div className="text-slate-400 text-sm">單位：{preset.unit}</div>
                      <div className="text-blue-600 font-mono font-bold">${preset.price.toLocaleString()}</div>
                    </div>
                    <button 
                      onClick={() => removePreset(preset.id)}
                      className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 頁尾 */}
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-slate-400 text-xs tracking-widest uppercase">
            Professional Estimation System · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
