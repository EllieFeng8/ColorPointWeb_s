import Home from './pages/Home.jsx';
import Preprocessing from './pages/Preprocessing.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ModelSet from "@/src/pages/ModelSet.jsx";
import EvaluatioClassify from "./pages/EvaluatioClassify.jsx";




function App() {
  return (
      // 所有路由相關的元件（包括 Home 裡面的 Link）都必須在 BrowserRouter 裡面
    <BrowserRouter>
        <Routes>
          {/* 定義路徑與對應的頁面元件 */}
          <Route path="/" element={<Home />} />
          <Route path="/preprocessing" element={<Preprocessing />} />
          <Route path="/modelSet" element={<ModelSet />} />
          <Route path="/evaluatioClassify" element={<EvaluatioClassify />} />
        </Routes>
    </BrowserRouter>


  );

}

export default App
