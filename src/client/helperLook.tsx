import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type Me } from './api.ts';
import { DEFAULT_AVATAR, type Avatar, type HelperLook } from '../shared/rewards.ts';

const pick = (a: Avatar): HelperLook => ({ helper: a.helper, helperFur: a.helperFur, helperHat: a.helperHat, helperExtra: a.helperExtra, mode: a.mode });

const Ctx = createContext<{ look: HelperLook; setAvatar: (a: Avatar) => void }>({ look: pick(DEFAULT_AVATAR), setAvatar: () => undefined });

/** Keeps the math helper dressed in the signed-in child's Star Store choices. */
export function HelperLookProvider({ children }: { children: ReactNode }) {
  const [look, setLook] = useState<HelperLook>(pick(DEFAULT_AVATAR));
  const { pathname } = useLocation();
  const kidPage = !pathname.startsWith('/parent') && pathname !== '/who';

  useEffect(() => {
    if (!kidPage) {
      setLook(pick(DEFAULT_AVATAR));
      return;
    }
    api<Me>('GET', '/api/me')
      .then((me) => setLook(pick({ ...DEFAULT_AVATAR, ...me.avatar })))
      .catch(() => undefined);
  }, [kidPage]);

  return <Ctx.Provider value={{ look, setAvatar: (a) => setLook(pick({ ...DEFAULT_AVATAR, ...a })) }}>{children}</Ctx.Provider>;
}

export const useHelperLook = () => useContext(Ctx);
