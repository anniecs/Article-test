"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Upload,
  Sparkles,
  FolderOpen,
  Settings,
  Check,
  X,
  ChevronRight,
  Printer,
  FileText,
  Network,
  MessageCircle,
  Plus,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import { type Sheet, type Words } from "./sample";
import Vault from "./Vault";
import MindMap from "./MindMap";
import { LockKeyhole } from "lucide-react";
import SpeakButton from "./SpeakButton";
import { builtinSheet, builtinLibrary, type BuiltinId } from './catalog';

export default function Home() {
  const [view, setView] = useState("studio"),
    [tab, setTab] = useState("reading"),
    [source, setSource] = useState("康軒學前9月份"),
    [title, setTitle] = useState("獅子與豪豬"),
    [article, setArticle] = useState(""),
    [level, setLevel] = useState("幼兒園"),
    [files, setFiles] = useState<File[]>([]),
    [demo, setDemo] = useState(true),
    [sheet, setSheet] = useState<Sheet>(builtinSheet('lion', '幼兒園')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showAnswers, setShowAnswers] = useState(false),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [library, setLibrary] = useState<Sheet[]>([]),
    [saved, setSaved] = useState(false),
    [keyReady, setKeyReady] = useState(false),
    [key, setKey] = useState(""),
    [modal, setModal] = useState(false),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState(1);
  const [vaultPassword, setVaultPassword] = useState("");
  const [builtinId, setBuiltinId] = useState<BuiltinId>('lion');
  const [originalId,setOriginalId] = useState('');
  const [coverBusy,setCoverBusy] = useState(false);
  const [coverError,setCoverError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setKeyReady((d as { ready: boolean }).ready))
      .catch(() => {});
  }, []);
  const words = (w: Words) => <span>{w.text}</span>;
  const sentences = (w: Words) => {
    const chars = Array.from(w.text);
    const parts: Words[] = [];
    let start = 0;
    chars.forEach((char, index) => {
      if (/[。！？!?…\n]/.test(char)) {
        const text = chars.slice(start, index + 1).join("").trim();
        if (text) parts.push({ text, zhuyin: [] });
        start = index + 1;
      }
    });
    const text = chars.slice(start).join("").trim();
    if (text) parts.push({ text, zhuyin: [] });
    return parts;
  };
  function clearResults() {
    setAnswers({});
    setShowAnswers(false);
    setSaved(false);
    setCoverError('');
  }
  function addFiles(list: File[]) {
    setError("");
    if (
      list.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp", "text/plain"].includes(
            f.type,
          ),
      )
    ) {
      setError("請上傳 JPG、PNG、WEBP 圖片或 TXT 文字檔。");
      return;
    }
    if (
      [...files, ...list].reduce((n, f) => n + f.size, 0) > 12 * 1024 * 1024 ||
      files.length + list.length > 10 ||
      list.some((f) => f.size > 8 * 1024 * 1024)
    ) {
      setError("最多 10 個檔案，每檔 8 MB，合計 12 MB。");
      return;
    }
    setFiles([...files, ...list]);
    setOriginalId('');
    setDemo(false);
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        setSheet({
          ...builtinSheet(builtinId, level),
          source,
          title: title || "獅子與豪豬",
        });
        clearResults();
        setTab("reading");
        return;
      }
      if (!vaultPassword) {
        setView("vault");
        throw Error("請先解鎖原文區，再上傳新文章。");
      }
      if (!source.trim()) throw Error("請填寫文章來源，方便歸類。");
      if (!article.trim() && !files.length && !originalId)
        throw Error("請先上傳文章或貼上文字。");
      if (!keyReady && !key) {
        setModal(true);
        throw Error("請先設定 AI 金鑰，再為新文章出題。你的文章會保留。");
      }
      const form = new FormData();
      form.set("source", source);
      form.set("title", title);
      form.set("article", article);
      form.set("level", level);
      if(originalId)form.set('originalId',originalId);
      files.forEach((f) => form.append("files", f));
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "X-Vault-Password": vaultPassword,
          ...(key ? { "X-AI-Key": key } : {}),
        },
        body: form,
      });
      const d = (await r.json()) as Sheet & { error?: string };
      if (!r.ok) throw Error(d.error || "出題暫時失敗，請重試。");
      setSheet(d);
      clearResults();
      setSaved(true);
      setTab("reading");
      setOriginalId(d.id || '');
      setFiles([]);
      setArticle('');
      setTitle(d.title);
      setSource(d.source);
      if(!d.cover)await createCover(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createCover(record:Sheet=sheet){
    if(!record.id)return;
    setCoverBusy(true);
    setCoverError('');
    try{
      const response=await fetch('/api/cover',{
        method:'POST',headers:{'Content-Type':'application/json',...(key?{'X-AI-Key':key}:{})},
        body:JSON.stringify({id:record.id})
      });
      const result=await response.json() as {cover?:string;error?:string};
      if(!response.ok||!result.cover)throw Error(result.error||'學習單已收藏，封面暫時無法生成。請稍後重試。');
      setSheet(current=>current.id===record.id?{...current,cover:result.cover}:current);
    }catch(e){setCoverError((e as Error).message);}
    finally{setCoverBusy(false);}
  }
  async function save() {
    setError("");
    try {
      const r = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheet),
      });
      if (!r.ok) throw Error("目前無法儲存，請稍後再試。");
      const savedRecord = (await r.json()) as { id: string };
      setSheet({ ...sheet, id: savedRecord.id });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function openLibrary() {
    setView("library");
    setError("");
    try {
      const r = await fetch("/api/library");
      if (!r.ok) throw Error();
      setLibrary((await r.json()) as Sheet[]);
    } catch {
      setError("文章庫暫時無法載入，請稍後重試。");
    }
  }
  const score = sheet.questions.filter(
    (q, i) => answers["q" + i] === String(q.answer),
  ).length;
  return (
    <div className="app">
      <aside className="sidebar">
          <a className="brand" href="/" aria-label="挖讀冊首頁">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span>
              挖讀冊
          </span>
        </a>
        <div className="workspace-label">我的閱讀空間</div>
        <nav>
          <button
            className={view === "studio" ? "active" : ""}
            onClick={() => setView("studio")}
          >
            <Sparkles size={19} /> 閱讀出題室
          </button>
          <button
            className={view === "library" ? "active" : ""}
            onClick={openLibrary}
          >
            <FolderOpen size={19} /> 我的文章庫
          </button>
          <button
            className={view === "vault" ? "active" : ""}
            onClick={() => setView("vault")}
          >
            <LockKeyhole size={19} /> 原文加密區
          </button>
        </nav>
        <div className="side-note">
          <BookOpen size={22} />
          <strong>
            每一篇故事，
            <br />
            都讓想法長大一點。
          </strong>
          <p>
            陪孩子讀懂文字，
            <br />
            也讀懂自己。
          </p>
        </div>
        <button className="settings" onClick={() => setModal(true)}>
          <Settings size={18} /> AI 連線設定
        </button>
        <div className="private-label">個人閱讀空間</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            我的閱讀空間 <ChevronRight size={15} />{" "}
            {view === "studio"
              ? "閱讀出題室"
              : view === "vault"
                ? "原文加密區"
                : "我的文章庫"}
          </span>
          <span className="account">
            親子共讀 <span className="avatar">讀</span>
          </span>
        </header>
        {view === "vault" ? (
          <Vault
            password={vaultPassword}
            onUnlock={setVaultPassword}
            onLock={() => setVaultPassword("")}
          />
        ) : view === "library" ? (
          <main className="content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR READING SHELF</div>
                <h1>我的文章庫</h1>
                <p>依文章來源收藏，每次共讀都找得到。</p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setView("studio");
                  setDemo(false);
                  setTitle("");
                  setArticle("");
                  setFiles([]);
                  setOriginalId('');
                }}
              >
                <Plus size={18} /> 新增文章
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {[
              ...new Set([...builtinLibrary(level).map(s => s.source), ...library.map((s) => s.source)]),
            ].map((s) => (
              <section className="library-group" key={s}>
                <h2>
                  <FolderOpen size={20} /> {s}
                </h2>
                <div className="library-grid">
                  {[
                    ...builtinLibrary(level).filter(a => a.source === s),
                    ...library.filter((a) => a.source === s),
                  ].map((item, i) => (
                    <button
                      className="library-card"
                      key={i}
                      onClick={() => {
                        setError('');
                        setTab('reading');
                        if (item.builtinId) {
                          setOriginalId('');
                          setBuiltinId(item.builtinId);
                          setDemo(true);
                          setSheet(builtinSheet(item.builtinId, level));
                        } else {
                          setOriginalId(item.id||'');
                          setDemo(false);
                          setSheet(item);
                          setLevel(item.level);
                        }
                        setTitle(item.title);
                        setSource(item.source);
                        setArticle('');
                        setFiles([]);
                        setView("studio");
                        clearResults();
                      }}
                    >
                      {item.cover ? <img className="library-cover" src={item.cover} alt={item.title + ' 原創封面'} /> : <div className="library-cover-placeholder"><BookOpen /></div>}
                      <h3>{item.title}</h3>
                      <p>
                        {item.level}
                      </p>
                      <div className="tags">
                        {item.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <small>開啟學習單 →</small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </main>
        ) : (
          <main className="content">
            <div className="page-heading">
              <div>
              <div className="eyebrow">挖讀冊</div>
              <h1>欸你 (Annie) 這次看哪一篇～</h1>
              <p>讀的每一頁，都算數。</p>
              </div>
              <span className="edition">
                閱讀出題室 <span>01</span>
              </span>
            </div>
            <div className="studio-grid">
              <section className="setup">
                <div className="panel">
                  <div className="section-title">
                    <span className="step">1</span>
                    <h2>文章與來源</h2>
                    <button
                      className="text-button"
                      onClick={() => {
                        setDemo(!demo);
                        setOriginalId('');
                        setBuiltinId('lion');
                        setFiles([]);
                        setArticle("");
                        setTitle(demo ? "" : "獅子與豪豬");
                        setSource(demo ? "" : "康軒學前9月份");
                      }}
                    >
                      {demo ? "新增文章" : "使用範例"}
                    </button>
                  </div>
                  {demo ? (
                    <div className="sample-book">
                      <div className="book-cover">
                        <img src={builtinSheet(builtinId, level).cover} alt={builtinSheet(builtinId, level).title + ' 原創封面'} />
                      </div>
                      <div>
                        <span className="mini-label">本次共讀文章</span>
                        <strong>{builtinSheet(builtinId, level).title}</strong>
                        <span>5 張圖片 · 第 42–51 頁</span>
                        <button
                          className="text-button"
                          onClick={() => setView("vault")}
                        >
                          前往原文區 <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {originalId && <p className="field-note">已載入收藏原文。解鎖原文區後，可依另一個程度重新出題；上傳新檔案會改用新文章。</p>}
                      <button
                        className="upload-zone"
                        onClick={() => input.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          addFiles(Array.from(e.dataTransfer.files));
                        }}
                      >
                        <Upload size={26} />
                        <strong>點擊或拖曳文章到這裡</strong>
                        <span>
                          JPG、PNG、WEBP、TXT
                          <br />
                          每檔 8 MB，最多 10 檔，合計 12 MB
                        </span>
                      </button>
                      <input
                        ref={input}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,text/plain"
                        hidden
                        onChange={(e) => {
                          addFiles(Array.from(e.target.files || []));
                          e.target.value = "";
                        }}
                      />
                      {files.map((f, i) => (
                        <div className="file-row" key={i}>
                          <FileText size={16} />
                          <span>
                            {i + 1}. {f.name}
                          </span>
                          <button
                            aria-label={"移除 " + f.name}
                            onClick={() =>
                              setFiles(files.filter((_, j) => j !== i))
                            }
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <label className="field">
                        或貼上文章
                        <textarea
                          value={article}
                          onChange={(e) => {setArticle(e.target.value);setOriginalId('');}}
                          placeholder="貼上完整文章內容…"
                          rows={4}
                        />
                      </label>
                    </>
                  )}
                  <label className="field">
                    文章名稱
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例如：獅子與豪豬"
                    />
                  </label>
                  <label className="field">
                    文章來源與期別
                    <input
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="例如：康軒學前9月份"
                    />
                  </label>
                  <p className="field-note">
                    來源由你指定，主題由文章內容歸類。
                  </p>
                </div>
                <div className="panel">
                  <div className="section-title">
                    <span className="step">2</span>
                    <h2>孩子的閱讀設定</h2>
                  </div>
                  <label className="field">學習階段</label>
                  <div className="segmented">
                    {["幼兒園", "小學低年級"].map((l) => (
                      <button
                        key={l}
                        aria-pressed={level === l}
                        className={level === l ? "selected" : ""}
                        onClick={() => {
                          setLevel(l);
                          if (demo) {
                            setSheet({...builtinSheet(builtinId, l), source, title});
                            clearResults();
                          }
                        }}
                      >
                        {level === l && <Check size={16} />} {l}
                      </button>
                    ))}
                  </div>
                  <p className="field-note">
                    {level === "幼兒園"
                      ? "使用短句與具體事件，適合大人陪讀、孩子口說。"
                      : "使用較完整的句子，練習理解、因果與簡單推論。"}
                  </p>
                  <button
                    className="primary generate"
                    disabled={busy||coverBusy}
                    onClick={generate}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={19} />
                    ) : (
                      <Sparkles size={19} />
                    )}{" "}
                    {coverBusy ? '正在製作原創封面…' : busy
                      ? "正在閱讀文章並出題…"
                      : demo
                        ? "依設定產生範例學習單"
                        : "產生閱讀學習單"}
                  </button>
                  <p className="generate-note">
                    5 題閱讀理解 ＋ 心智圖 ＋ 2 題開放題
                  </p>
                  {!demo && <p className="generate-note">自動製作原創封面並收藏。文字、圖片與朗讀依 API 使用量計費。</p>}
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              </section>
              <section className="results">
                <div className="result-toolbar">
                  <span>
                    <span className="tiny-line" /> 學習單預覽
                  </span>
                  <div>
                    <button onClick={save} disabled={saved}>
                      <FolderOpen size={16} />
                      {saved ? "已收藏" : "收藏"}
                    </button>
                    <button onClick={() => window.print()}>
                      <Printer size={16} />
                      列印目前頁籤
                    </button>
                  </div>
                </div>
                {!sheet.sample && sheet.id && <div className="cover-summary" aria-live="polite">
                  {sheet.cover && <img src={sheet.cover} alt={sheet.title+' 原創封面'}/>}
                  <div><strong>{coverBusy?'正在依文章主軸製作封面…':sheet.cover?'原創封面已收藏':'學習單已收藏，封面尚未完成'}</strong>
                    {coverError && <p role="alert">{coverError}</p>}
                    {!sheet.cover && <button className="text-button" disabled={coverBusy||busy} onClick={()=>createCover()}>{coverBusy?'請稍候…':'生成／重試封面'}</button>}
                  </div>
                </div>}
                <article className="worksheet">
                  <div className="worksheet-header">
                  <div className="sheet-kicker">
                    挖讀冊 · 閱讀學習單
                  </div>
                    <h2>{sheet.title}</h2>
                    <p>{sheet.source}</p>
                    <div className="tags">
                      <span>{sheet.level}</span>
                      {sheet.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="name-line">
                      姓名 <span /> 日期 <span />
                    </div>
                  </div>
                  <div className="tabs" role="tablist">
                    {[
                      { id: "reading", label: "閱讀理解", Icon: BookOpen },
                      { id: "mind", label: "心智圖", Icon: Network },
                      { id: "open", label: "開放題", Icon: MessageCircle },
                      { id: "adapted", label: "小文章", Icon: FileText },
                    ].map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={tab === id}
                        className={tab === id ? "selected" : ""}
                        onClick={() => setTab(id)}
                      >
                        <Icon size={17} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="worksheet-body">
                    {tab === "reading" && (
                      <>
                        <div className="exercise-heading">
                          <h3>讀一讀，選一選</h3>
                          <span>共 5 題</span>
                        </div>
                        <p className="exercise-intro">
                          {sheet.level.startsWith("幼兒園")
                            ? "請大人陪你念題，選出你認為最合適的答案。"
                            : "回想文章內容，每題選出一個最合適的答案。"}
                        </p>
                        <div className="read-aloud-note">
                          <SpeakButton
                            text={sheet.questions.map((q) => q.prompt.text).join("。")}
                            label="朗讀全部題目"
                            sample={sheet.sample}
                            apiKey={key}
                          />
                          <span>我幫你讀題：按喇叭聽一句，也可以一次聽完題目。</span>
                        </div>
                        {sheet.questions.map((q, i) => (
                          <div className="question" key={i}>
                            <div className="question-title">
                              <span className="qnumber">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <h4>{words(q.prompt)}</h4>
                              <SpeakButton
                                text={q.prompt.text}
                                label={`朗讀第 ${i + 1} 題`}
                                sample={sheet.sample}
                                apiKey={key}
                              />
                            </div>
                            <div className="options">
                              {q.options.map((o, j) => (
                                <div
                                  key={j}
                                  className={`option-row ${
                                    (answers["q" + i] === String(j)
                                      ? "chosen "
                                      : "") +
                                    (showAnswers && q.answer === j
                                      ? "correct"
                                      : "")
                                  }`}
                                >
                                  <label>
                                    <input
                                      type="radio"
                                      name={"q" + i}
                                      checked={answers["q" + i] === String(j)}
                                      onChange={() =>
                                        setAnswers({
                                          ...answers,
                                          ["q" + i]: String(j),
                                        })
                                      }
                                    />
                                    <span className="option-letter">
                                      {String.fromCharCode(65 + j)}
                                    </span>
                                    {words(o)}
                                  </label>
                                  <SpeakButton
                                    text={o.text}
                                    label={`朗讀選項 ${String.fromCharCode(65 + j)}`}
                                    sample={sheet.sample}
                                    apiKey={key}
                                  />
                                </div>
                              ))}
                            </div>
                            {showAnswers && (
                              <div className="explanation">
                                <Check size={16} />
                                <span>
                                  參考答案：{String.fromCharCode(65 + q.answer)}
                                  。{words(q.explanation)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {tab === "mind" && (
                      <MindMap
                        key={sheet.id || sheet.level}
                        sheet={sheet}
                        words={words}
                        answers={answers}
                        setAnswers={setAnswers}
                        showAnswers={showAnswers}
                        apiKey={key}
                      />
                    )}
                    {tab === "open" && (
                      <>
                        <div className="exercise-heading">
                          <h3>想一想，說說看</h3>
                          <span>共 2 題</span>
                        </div>
                        <p className="exercise-intro">
                          沒有唯一答案。可以說出來、寫下來，也可以在列印後畫一畫。
                        </p>
                        <div className="read-aloud-note">
                          <SpeakButton
                            text={sheet.open.map((q) => q.prompt.text).join("。")}
                            label="朗讀全部開放題"
                            sample={sheet.sample}
                            apiKey={key}
                          />
                          <span>我幫你讀題：按喇叭聽題目。</span>
                        </div>
                        {sheet.open.map((q, i) => (
                          <div className="question" key={i}>
                            <div className="question-title">
                              <span className="qnumber">0{i + 1}</span>
                              <h4>{words(q.prompt)}</h4>
                              <SpeakButton
                                text={q.prompt.text}
                                label={`朗讀第 ${i + 1} 題`}
                                sample={sheet.sample}
                                apiKey={key}
                              />
                            </div>
                            <textarea
                              className="open-answer"
                              rows={5}
                              aria-label={q.prompt.text}
                              value={answers["o" + i] || ""}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  ["o" + i]: e.target.value,
                                })
                              }
                              placeholder="我的想法是…"
                            />
                            {showAnswers && (
                              <div className="explanation">
                                陪讀引導：{words(q.guide)}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    {tab === "adapted" && (
                      <>
                        <div className="exercise-heading">
                          <h3>再讀一次，小小故事</h3>
                          <span>{sheet.level}</span>
                        </div>
                        <p className="exercise-intro">
                          依學習階段重新編排，適合孩子練習自己讀。
                        </p>
                        <div className="read-aloud-note">
                          <SpeakButton
                            text={sheet.adapted.text}
                            label="朗讀整篇小文章"
                            sample={sheet.sample}
                            apiKey={key}
                          />
                          <span>我幫你讀：每一句都可以單獨播放。</span>
                        </div>
                        <div className="adapted-story">
                          {sentences(sheet.adapted).map((sentence, index) => (
                            <div className="sentence-row" key={`${sentence.text}-${index}`}>
                              <p>{words(sentence)}</p>
                              <SpeakButton
                                text={sentence.text}
                                label={`朗讀第 ${index + 1} 句`}
                                sample={sheet.sample}
                                apiKey={key}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="adapted-source">
                          <LockKeyhole size={15} />
                          <span>原始照片與完整文字存放於原文加密區。</span>
                          <button
                            className="text-button"
                            onClick={() => setView("vault")}
                          >
                            開啟原文區
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {tab !== "adapted" && (
                    <footer className="sheet-footer">
                      <span>
                        {showAnswers && tab === "reading"
                          ? `已答對 ${score} / 5 題`
                          : "給思考一點時間，讓答案慢慢發芽。"}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setShowAnswers(!showAnswers)}
                      >
                        {showAnswers ? "隱藏參考答案" : "查看參考答案"}
                      </button>
                    </footer>
                  )}
                </article>
                <p className="below-note">
                  {sheet.sample
                    ? "此範例題目依你提供的文章編寫。"
                    : "AI 產生的題目，請陪讀者確認內容後使用。"}{" "}
                  朗讀為合成語音；作答內容僅保留於本次頁面。
                </p>
              </section>
            </div>
          </main>
        )}
      </div>
      {modal && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="modal"
          >
            <button
              className="close"
              aria-label="關閉"
              onClick={() => setModal(false)}
            >
              <X />
            </button>
            <Settings size={26} />
            <h2 id="settings-title">AI 連線設定</h2>
            <p>同一組 API key 用於文章辨識、設計學習單、生成原創封面與朗讀。範例不需要金鑰即可使用。</p>
            <p>API 帳戶需有可用額度與圖片模型權限；圖片生成可能需要完成 OpenAI 帳戶驗證。</p>
            <p className="connection-state">
              {keyReady ? "網站已設定 AI 金鑰" : "尚未設定網站 AI 金鑰"}
            </p>
            <label className="field">
              本次使用的 OpenAI API 金鑰
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-…"
              />
            </label>
            <p className="field-note">
              金鑰只保留在本次頁面的記憶體，經本站伺服器傳送給
              OpenAI；重新整理後需再次輸入。也可之後設定網站的伺服器金鑰。
            </p>
            <button
              className="primary"
              onClick={() => {
                setModal(false);
                setNotice(
                  key
                    ? "已套用本次金鑰，產生新題目時會驗證連線。"
                    : "你可以先使用範例學習單。",
                );
              }}
            >
              套用設定
            </button>
          </section>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="關閉通知" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
