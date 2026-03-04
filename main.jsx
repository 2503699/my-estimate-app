import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Plus, Trash2, Printer, Calculator, Settings, 
  Database, ArrowLeft, Edit2, X, CloudLine, CloudOff, Loader2, ListChecks
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

// --- Firebase 配置 (由環境自動注入) ---
// 增加防呆：確保配置存在才初始化
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-estimate-app';

const App = () => {
  // --- 狀態管理 ---
  const [view, setView] = useState('estimate');
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // 數據狀態
  const [items, setItems] = useState([{ id: 1, name: '', price: 0, quantity: 1, unit: '個', subtotal: 0 }]);
  const [presetItems, setPresetItems] = useState([
    { id: 'p1', name: '水泥施工', price: 2000, unit: '坪' },
    { id: 'p2', name: '矽利康填補', price: 150, unit: '支' },
    { id: 'p3', name: '油漆工程', price: 800, unit: '面' }
  ]);
  const [taxRate, setTaxRate] = useState(5);
  const [clientName, setClientName] = useState('');
  const [note, setNote] = useState('');

  // --- 1. 身分驗證 (Rule 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 優化：先檢查環境提供的 Token
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. 資料讀取 (Rule 1 & 2) ---
  useEffect(() => {
    if (!user) return;

    // 取得該使用者的專屬私有路徑
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'appData');
    
    setIsSyncing(true);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // 確保資料存在才更新狀態，避免覆蓋掉初始值
        if (data.items) setItems(data.items);
        if (data.presetItems) setPresetItems(data.presetItems);
        if (data.taxRate !== undefined) setTaxRate(data.taxRate);
        if (data.clientName !== undefined) setClientName(data.clientName);
        if (data.note !== undefined) setNote(data.note);
      } else {
        // 如果雲端沒資料，就先存一份初始資料上去
        saveDataToCloud({
          items,
          presetItems,
          taxRate,
          clientName,
          note
        });
      }
      setIsSyncing(false);
    }, (err) => {
      console.error("Firestore Listen Error", err);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- 3. 資料存檔 (Rule 1) ---
  const saveDataToCloud = async (newData) => {
    if (!user) return;
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'appData');
    try {
      await setDoc(userDocRef, newData, { merge: true });
    } catch (err) {
      console.error("Cloud Save Error", err);
    }
  };

  // --- 操作邏輯 ---
  const updateItemsAndSave = (newItems) => {
    setItems(newItems);
    saveDataToCloud({ items: newItems });
  };

  const updatePresetsAndSave = (newPresets) => {
    setPresetItems(newPresets);
    saveDataToCloud({ presetItems: newPresets });
  };

  const totals = useMemo(() => {
    const sub = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
    const tax = Math.round(sub * (taxRate / 100));
    return { sub, tax, total: sub + tax };
  }, [items, taxRate]);

  // 估價單操作
  const addItem = () => updateItemsAndSave([...items, { id: Date.now(), name: '', price: 0, quantity: 1, unit: '個', subtotal: 0 }]);
  const removeItem = (id) => items.length > 1 && updateItemsAndSave(items.filter(i => i.id !== id));
  const updateItem = (id, f, v) => {
    const newItems = items.map(i => {
      if (i.id === id) {
        let u = { ...i, [f]: v };
        if (f === 'name') {
          const p = presetItems.find(x => x.name === v);
          if (p) { u.price = p.price; u.unit = p.unit; }
        }
        u.subtotal = Number(u.price) * Number(u.quantity);
        return u;
      }
      return i;
    });
    updateItemsAndSave(newItems);
  };

  // 資料庫操作
  const addPreset = () => updatePresetsAndSave([...presetItems, { id: Date.now(), name: '新項目', price: 0, unit: '個' }]);
  const removePreset = (id) => updatePresetsAndSave(presetItems.filter(p => p.id !== id));
  const updatePreset = (id, f, v) => {
    const newPresets = presetItems.map(p => p.id === id ? { ...p, [f]: v } : p);
    updatePresetsAndSave(newPresets);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* 頂部狀態列 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2.5 rounded-xl text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {view === 'estimate' ? '雲端估價助手' : '項目資料管理'}
              </h1>
              <div className="flex items-center gap-2">
                {isSyncing ? (
                  <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> 雲端同步中...
                  </span>
                ) : user ? (
                  <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> 資料同步成功
                  </span>
                ) : (
                  <span className="text-[10px] text-red-400 font-bold">登入中...</span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setView(view === 'estimate' ? 'manage' : 'estimate')}
            className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-sm ${
              view === 'estimate' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            }`}
          >
            {view === 'estimate' ? <><Settings className="w-5 h-5" /> 管理品項</> : <><ArrowLeft className="w-5 h-5" /> 返回估價</>}
          </button>
        </div>

        {view === 'estimate' ? (
          <div className="space-y-4">
            {/* 客戶與稅率 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                <Edit2 className="w-4 h-4 text-slate-400" />
                <input 
                  placeholder="客戶名稱..." 
                  value={clientName} 
                  onChange={e => { setClientName(e.target.value); saveDataToCloud({ clientName: e.target.value }); }} 
                  className="w-full outline-none text-slate-700 font-bold bg-transparent" 
                />
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-400">稅率(%)</span>
                <input 
                  type="number" 
                  value={taxRate} 
                  onChange={e => { setTaxRate(Number(e.target.value)); saveDataToCloud({ taxRate: Number(e.target.value) }); }} 
                  className="w-full outline-none text-slate-700 font-bold bg-transparent text-right" 
                />
              </div>
            </div>

            {/* 報價清單 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><ListChecks className="w-4 h-4" /> 報價清單</span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-slate-50">
                      <div className="col-span-4 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">{index + 1}</span>
                        <input 
                          list="presets" 
                          value={item.name} 
                          placeholder="項目名稱"
                          onChange={e => updateItem(item.id, 'name', e.target.value)} 
                          className="w-full p-1 outline-none text-slate-700 font-semibold bg-transparent" 
                        />
                        <datalist id="presets">{presetItems.map(p => <option key={p.id} value={p.name} />)}</datalist>
                      </div>
                      <div className="col-span-2"><input value={item.unit} placeholder="單位" onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full text-center text-slate-500 outline-none bg-transparent" /></div>
                      <div className="col-span-2"><input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', Number(e.target.value))} className="w-full text-right text-slate-700 outline-none bg-transparent font-medium" /></div>
                      <div className="col-span-1"><input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-full text-center text-slate-700 outline-none bg-transparent font-medium" /></div>
                      <div className="col-span-2 text-right font-black text-slate-800">${Math.round(item.subtotal).toLocaleString()}</div>
                      <div className="col-span-1 text-right"><button onClick={() => removeItem(item.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button onClick={addItem} className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-slate-400 transition-all"><Plus className="w-5 h-5" /> 新增報價項目</button>
              </div>
            </div>

            {/* 總計與備註 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">備註事項</label>
                <textarea 
                  value={note} 
                  onChange={e => { setNote(e.target.value); saveDataToCloud({ note: e.target.value }); }} 
                  placeholder="付款方式、保固、施工說明..."
                  rows="5" 
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm text-slate-600 outline-none resize-none" 
                />
              </div>
              <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl text-white flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center opacity-60 text-sm"><span>項目合計</span><span>${totals.sub.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center opacity-60 text-sm"><span>稅額 ({taxRate}%)</span><span>${totals.tax.toLocaleString()}</span></div>
                  <div className="h-px bg-white/10 my-2"></div>
                  <div className="flex justify-between items-end"><span className="text-sm font-bold text-slate-400">總計金額</span><span className="text-3xl font-black">${totals.total.toLocaleString()}</span></div>
                </div>
                <button onClick={() => window.print()} className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"><Printer className="w-5 h-5" /> 列印報價單</button>
              </div>
            </div>
          </div>
        ) : (
          /* 管理畫面 */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 flex items-center gap-2"><Database className="w-5 h-5" /> 常用項目資料庫</h3>
              <button onClick={addPreset} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md"><Plus className="w-4 h-4" /> 新增項目</button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {presetItems.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">名稱</label>
                    <input value={p.name} onChange={(e) => updatePreset(p.id, 'name', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-slate-700" />
                  </div>
                  <div className="w-full sm:w-24 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 text-center block">單位</label>
                    <input value={p.unit} onChange={(e) => updatePreset(p.id, 'unit', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-center" />
                  </div>
                  <div className="w-full sm:w-32 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 text-right block">預設單價</label>
                    <input type="number" value={p.price} onChange={(e) => updatePreset(p.id, 'price', Number(e.target.value))} className="w-full p-2 bg-slate-50 rounded-lg outline-none text-right font-black text-slate-700" />
                  </div>
                  <div className="pt-5"><button onClick={() => removePreset(p.id)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-5 h-5" /></button></div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-slate-50 text-center border-t border-slate-100"><p className="text-xs text-slate-400">資料庫即時同步中，更換設備資料不遺失。</p></div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 啟動 ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;
