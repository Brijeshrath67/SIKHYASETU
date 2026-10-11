import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AskGuruDrawer } from './AskGuruDrawer';

type GuruContextValue = {
  isOpen: boolean;
  activeConceptId: string | null;
  openGuru: (conceptId?: string | null) => void;
  closeGuru: () => void;
};

const GuruContext = createContext<GuruContextValue | null>(null);

export function useGuru(): GuruContextValue {
  const ctx = useContext(GuruContext);
  if (!ctx) throw new Error('useGuru must be used within a GuruProvider');
  return ctx;
}

export function GuruProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);

  const openGuru = useCallback((conceptId?: string | null) => {
    setActiveConceptId(conceptId ?? null);
    setIsOpen(true);
  }, []);

  const closeGuru = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, activeConceptId, openGuru, closeGuru }),
    [isOpen, activeConceptId, openGuru, closeGuru],
  );

  return (
    <GuruContext.Provider value={value}>
      {children}
      <AskGuruDrawer />
    </GuruContext.Provider>
  );
}
