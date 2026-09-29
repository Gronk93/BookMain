import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Highlighter,
  Library,
  Menu,
  Moon,
  NotebookPen,
  PanelRight,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  useParams,
  Router as WouterRouter,
} from 'wouter';

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  pages: number;
  currentPage: number;
  color: string;
  accent: string;
  label: string;
  added: string;
};
type ReaderTheme = 'paper' | 'sepia' | 'night';

const seed: Book[] = [
  { id: 'ways-of-seeing', title: 'Ways of Seeing', author: 'John Berger', category: 'Essays', pages: 176, currentPage: 48, color: '#315653', accent: '#D3A16E', label: 'SEE / THINK', added: 'Continue reading' },
  { id: 'living-mountain', title: 'The Living Mountain', author: 'Nan Shepherd', category: 'Nature', pages: 160, currentPage: 22, color: '#788B79', accent: '#EFE0C4', label: 'A MOUNTAIN', added: 'Added 4 days ago' },
  { id: 'the-waves', title: 'The Waves', author: 'Virginia Woolf', category: 'Fiction', pages: 212, currentPage: 1, color: '#42536B', accent: '#B8C7D1', label: 'THE WAVES', added: 'Added 2 weeks ago' },
];

const readingText = {
  chapter: 'Chapter 01 · Seeing',
  title: 'Seeing comes before words.',
  paragraphs: [
    'The child looks and recognizes before it can speak. But there is also another sense in which seeing comes before words.',
    'It is seeing which shapes our place in the world and determines what we notice.',
  ],
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return (
    <div
      className={`book-cover relative overflow-hidden rounded-[4px] text-white shadow-lg ${compact ? 'h-40 w-28' : 'h-64 w-44 sm:h-72 sm:w-48'}`}
      style={{ background: `linear-gradient(145deg, ${book.color}, #1d3031)` }}
    >
      <div className="absolute inset-3 border border-white/25" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <span className="font-mono text-[9px] tracking-[0.24em] text-white/70">BOOKMIND EDITION</span>
        <div>
          <div className="mb-4 h-1 w-9" style={{ backgroundColor: book.accent }} />
          <p className={`serif leading-none ${compact ? 'text-xl' : 'text-3xl'}`}>{book.label}</p>
          <p className="mt-3 max-w-[12ch] font-mono text-[8px] uppercase tracking-[0.16em] text-white/70">{book.title}</p>
        </div>
      </div>
    </div>
  );
}

function AppShell({ children, onToggleTheme }: { children: ReactNode; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const inReader = location.startsWith('/read/');
  return (
    <div className="grain min-h-screen bg-background">
      <header className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 text-muted-foreground hover-elevate md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">
            <Menu size={19} />
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpen size={17} /></span>
            <span className="font-semibold tracking-[-0.03em]">bookmind</span>
          </Link>
        </div>
        <nav className={`${menuOpen ? 'flex' : 'hidden'} absolute left-5 right-5 top-16 z-20 flex-col gap-1 rounded-2xl border bg-card p-2 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <Link href="/" className={`rounded-full px-4 py-2 text-sm transition ${!inReader ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/70'}`} onClick={() => setMenuOpen(false)}>Library</Link>
          <span className="cursor-default rounded-full px-4 py-2 text-sm text-muted-foreground/50">Notes</span>
          <span className="cursor-default rounded-full px-4 py-2 text-sm text-muted-foreground/50">Study</span>
        </nav>
        <button className="rounded-full p-2.5 text-muted-foreground hover-elevate" onClick={onToggleTheme} aria-label="Cambiar tema">
          <Moon size={18} />
        </button>
      </header>
      {children}
    </div>
  );
}

function Home({ books, setBooks }: { books: Book[]; setBooks: React.Dispatch<React.SetStateAction<Book[]>> }) {
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const activeBook = books[0];
  const filtered = books.filter((book) => `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search.toLowerCase()));

  const importBook = (file?: File) => {
    if (!file) return;
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') || 'New book';
    const book: Book = {
      id: `uploaded-${Date.now()}`,
      title: title.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      author: 'Imported document',
      category: 'New',
      pages: 128,
      currentPage: 1,
      color: '#5B526F',
      accent: '#E2B6A4',
      label: 'NEW READING',
      added: 'Just imported',
    };
    setProcessing(true);
    window.setTimeout(() => {
      setBooks((current) => [book, ...current]);
      setProcessing(false);
      setNotice('Your book is ready to read.');
      window.setTimeout(() => setNotice(''), 3000);
    }, 1200);
  };

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
      <section className="animate-rise-in flex flex-col justify-between gap-8 border-b border-border/70 pb-10 pt-10 sm:flex-row sm:items-end sm:pt-16">
        <div>
          <p className="mono mb-4 text-[10px] uppercase tracking-[0.2em] text-primary">Saturday, September 26</p>
          <h1 className="serif max-w-xl text-5xl leading-[0.95] tracking-[-0.04em] sm:text-6xl">A little more understanding, every day.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">Your reading space for books that stay with you.</p>
        </div>
        <button className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5" onClick={() => fileInput.current?.click()}>
          <Plus size={17} /> Add a book
        </button>
        <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => importBook(event.target.files?.[0])} />
      </section>

      {notice && <div className="mt-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"><Check size={16} /> {notice}</div>}
      {processing && <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"><Upload size={16} className="animate-bounce text-primary" /> Preparing your book for reading…</div>}

      <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl bg-primary p-7 text-primary-foreground shadow-[0_20px_50px_rgba(49,86,83,.16)] sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div><p className="mono text-[10px] uppercase tracking-[0.2em] text-primary-foreground/65">Continue reading</p><h2 className="serif mt-3 text-4xl leading-none">{activeBook.title}</h2><p className="mt-3 text-sm text-primary-foreground/70">{activeBook.author}</p></div>
            <BookOpen size={24} className="text-primary-foreground/60" />
          </div>
          <div className="mt-10 flex items-end justify-between"><div><p className="text-sm text-primary-foreground/70">Chapter 01 · Seeing</p><p className="mono mt-2 text-xs text-primary-foreground/60">Page {activeBook.currentPage} of {activeBook.pages}</p></div><span className="serif text-4xl">{Math.round((activeBook.currentPage / activeBook.pages) * 100)}%</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#D3A16E]" style={{ width: `${(activeBook.currentPage / activeBook.pages) * 100}%` }} /></div>
          <Link href={`/read/${activeBook.id}`} className="mt-7 flex w-fit items-center gap-2 text-sm font-medium text-primary-foreground hover:underline">Continue reading <ArrowRight size={16} /></Link>
        </div>
        <div className="rounded-3xl border border-border bg-card p-7 sm:p-10">
          <div className="flex items-center justify-between"><p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">This week</p><NotebookPen size={18} className="text-accent" /></div>
          <p className="serif mt-5 text-4xl">A quiet<br />kind of progress.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5"><Stat value="2" label="active books" /><Stat value="14" label="notes made" /><Stat value="28" label="highlights" /></div>
        </div>
      </section>

      <section className="pt-2">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your library</p><h2 className="serif mt-2 text-3xl">Books to return to</h2></div><label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your library" className="w-40 bg-transparent outline-none placeholder:text-muted-foreground/60" /></label></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((book, index) => <BookCard key={book.id} book={book} index={index} />)}</div>
        {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No books match that search.</div>}
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><p className="serif text-2xl">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}

function BookCard({ book, index }: { book: Book; index: number }) {
  const progress = Math.round((book.currentPage / book.pages) * 100);
  return <Link href={`/read/${book.id}`} className="group animate-rise-in block rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="flex gap-5"><Cover book={book} compact /><div className="flex min-w-0 flex-1 flex-col justify-between py-1"><div><p className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{book.category}</p><h3 className="serif mt-2 text-2xl leading-none">{book.title}</h3><p className="mt-2 text-xs text-muted-foreground">{book.author}</p></div><div><div className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>{book.added}</span><span>{progress}%</span></div><div className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(progress, 2)}%` }} /></div></div></div></div>
  </Link>;
}

function Reader({ books, setBooks }: { books: Book[]; setBooks: React.Dispatch<React.SetStateAction<Book[]>> }) {
  const { bookId } = useParams<{ bookId: string }>();
  const book = books.find((item) => item.id === bookId);
  const [theme, setTheme] = useState<ReaderTheme>(() => readStored<ReaderTheme>('bookmind-theme', 'paper'));
  const [page, setPage] = useState(book?.currentPage ?? 1);
  const [panel, setPanel] = useState<'none' | 'insight' | 'note'>('none');
  const [note, setNote] = useState(() => readStored<string>(`bookmind-note-${bookId}`, ''));
  const [saved, setSaved] = useState(() => readStored<boolean>(`bookmind-bookmark-${bookId}`, false));
  const [selected, setSelected] = useState(false);
  const current = book ? { ...book, currentPage: page } : undefined;
  const percent = current ? Math.round((page / current.pages) * 100) : 0;

  useEffect(() => { if (bookId) window.localStorage.setItem('bookmind-theme', JSON.stringify(theme)); }, [theme, bookId]);
  useEffect(() => { if (bookId) window.localStorage.setItem(`bookmind-bookmark-${bookId}`, JSON.stringify(saved)); }, [saved, bookId]);
  useEffect(() => { if (bookId) window.localStorage.setItem(`bookmind-note-${bookId}`, JSON.stringify(note)); }, [note, bookId]);
  if (!current) return <NotFound />;
  const goTo = (next: number) => {
    const nextPage = Math.max(1, Math.min(current.pages, next));
    setPage(nextPage);
    setBooks((items) => items.map((item) => item.id === bookId ? { ...item, currentPage: nextPage } : item));
  };
  const pageTitle = page === 48 ? readingText.title : 'The shape of an idea.';
  const paragraphs = page === 48 ? readingText.paragraphs : ['A book becomes useful when its ideas have somewhere to land. Reading is not only the act of moving through words; it is the moment a thought becomes part of your own way of seeing.', 'Return to this page whenever you want to follow the thread again.'];
  return <div className={`min-h-[calc(100vh-72px)] ${theme === 'night' ? 'bg-[#202928] text-[#E9E4D7]' : theme === 'sepia' ? 'bg-[#E7DAC3] text-[#4A3C2E]' : 'reading-paper'}`}>
    <div className="mx-auto flex max-w-[1400px] items-center justify-between border-y border-border/50 px-5 py-3 sm:px-8"><Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Library</Link><div className="text-center"><p className="serif text-lg">{current.title}</p><p className="mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{readingText.chapter}</p></div><div className="flex items-center gap-1"><button className="rounded-full p-2.5 text-muted-foreground hover-elevate" onClick={() => setSaved(!saved)} aria-label="Guardar marcador">{saved ? <BookmarkCheck size={18} className="text-accent" /> : <Bookmark size={18} />}</button><button className="rounded-full p-2.5 text-muted-foreground hover-elevate" onClick={() => setPanel(panel === 'note' ? 'none' : 'note')} aria-label="Abrir notas"><NotebookPen size={18} /></button><button className="rounded-full p-2.5 text-muted-foreground hover-elevate" onClick={() => setTheme(theme === 'night' ? 'paper' : 'night')} aria-label="Cambiar tema">{theme === 'night' ? <Sun size={18} /> : <Moon size={18} />}</button></div></div>
    <div className="mx-auto grid max-w-[1400px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_280px]">
      <main><div className="mx-auto max-w-2xl"><div className="mb-12 flex items-center justify-between text-muted-foreground"><span className="mono text-[10px] uppercase tracking-[0.18em]">{current.category} · {percent}% read</span><button className="rounded-full p-2 hover-elevate" onClick={() => setPanel(panel === 'insight' ? 'none' : 'insight')} aria-label="Abrir BookMind"><Sparkles size={17} /></button></div><article className="serif text-[21px] leading-[1.72] sm:text-[24px]"><p className="mb-8 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{readingText.chapter}</p><h1 className="mb-10 max-w-xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">{pageTitle}</h1>{paragraphs.map((paragraph, index) => <p key={paragraph} className="mb-8">{index === 0 && page === 48 ? <><span className={selected ? 'rounded bg-[#D3A16E]/35 underline decoration-[#C7885D] decoration-2 underline-offset-4' : ''} onClick={() => setSelected(!selected)}>{paragraph.slice(0, 67)}</span>{paragraph.slice(67)}</> : paragraph}</p>)}</article><div className="mt-12 flex items-center justify-between border-t border-border/70 pt-5"><button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => goTo(page - 1)} disabled={page === 1}><ChevronLeft size={17} /> Previous</button><span className="mono text-[10px] text-muted-foreground">PAGE {page} / {current.pages}</span><button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => goTo(page + 1)} disabled={page === current.pages}>Next <ChevronRight size={17} /></button></div></div></main>
      {panel !== 'none' && <aside className="animate-rise-in rounded-2xl border border-border bg-card/85 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm lg:mt-14">{panel === 'note' ? <NotePanel note={note} setNote={setNote} close={() => setPanel('none')} /> : <InsightPanel selected={selected} close={() => setPanel('none')} />}</aside>}
    </div>
    {selected && panel === 'none' && <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-lg"><button className="flex items-center gap-2 rounded-full px-3 py-2 text-xs hover:bg-secondary" onClick={() => setPanel('note')}><NotebookPen size={14} /> Note</button><button className="flex items-center gap-2 rounded-full px-3 py-2 text-xs hover:bg-secondary" onClick={() => setPanel('insight')}><Sparkles size={14} /> Explain</button><button className="flex items-center gap-2 rounded-full px-3 py-2 text-xs hover:bg-secondary" onClick={() => setSelected(false)}><X size={14} /> Clear</button></div>}
  </div>;
}

function NotePanel({ note, setNote, close }: { note: string; setNote: (value: string) => void; close: () => void }) {
  return <><div className="flex items-center justify-between"><div className="flex items-center gap-2"><NotebookPen size={16} className="text-accent" /><p className="font-medium">Your note</p></div><button onClick={close} aria-label="Cerrar notas"><X size={16} /></button></div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What do you want to remember?" className="mt-5 min-h-36 w-full resize-none rounded-xl border border-border bg-background/60 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" /><p className="mt-3 text-[11px] text-muted-foreground">Saved automatically in this browser.</p></>;
}

function InsightPanel({ selected, close }: { selected: boolean; close: () => void }) {
  return <><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles size={16} className="text-accent" /><p className="font-medium">BookMind</p></div><button onClick={close} aria-label="Cerrar explicación"><X size={16} /></button></div><p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">A closer look</p><p className="serif mt-3 text-2xl leading-tight">{selected ? 'Seeing is the first way we make meaning.' : 'Select a sentence to explore it.'}</p><p className="mt-5 text-sm leading-6 text-muted-foreground">{selected ? 'Berger is pointing to a simple order: before we explain the world with language, we have already begun to interpret it with our eyes. What we notice is never entirely neutral.' : 'BookMind can help you slow down a sentence, connect it to the chapter, or find a simpler way to understand it.'}</p><div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground"><FileText size={14} /> Based on the current page</div></>;
}

function Router() {
  const [books, setBooks] = useState<Book[]>(() => readStored('bookmind-books', seed));
  const [dark, setDark] = useState(false);
  useEffect(() => { window.localStorage.setItem('bookmind-books', JSON.stringify(books)); }, [books]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  return <AppShell onToggleTheme={() => setDark(!dark)}><Switch><Route path="/" component={() => <Home books={books} setBooks={setBooks} />} /><Route path="/read/:bookId" component={() => <Reader books={books} setBooks={setBooks} />} /><Route component={NotFound} /></Switch></AppShell>;
}

const queryClient = new QueryClient();
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;