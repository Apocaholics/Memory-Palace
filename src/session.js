export const SESSION_VERSION = 1;

export function reduce(session, action) {
  switch (action.type) {
    case 'start':
      if (session) return session;
      return {
        version: SESSION_VERSION,
        id: action.id,
        createdAt: action.createdAt,
        order: action.order,
        phase: 'layout',
        layoutIndex: 0,
        revealed: false,
        marks: [],
      };

    case 'next':
      if (session?.phase !== 'layout' || session.layoutIndex >= session.order.length - 1) return session;
      return { ...session, layoutIndex: session.layoutIndex + 1 };

    case 'back':
      if (session?.phase !== 'layout' || session.layoutIndex <= 0) return session;
      return { ...session, layoutIndex: session.layoutIndex - 1 };

    case 'layoutDone':
      if (session?.phase !== 'layout' || session.layoutIndex !== session.order.length - 1) return session;
      return { ...session, phase: 'memorize' };

    case 'backToLayout':
      if (session?.phase !== 'memorize') return session;
      return { ...session, phase: 'layout', layoutIndex: session.order.length - 1 };

    case 'startWriting':
      if (session?.phase !== 'memorize') return session;
      return { ...session, phase: 'write' };

    case 'startCheck':
      if (session?.phase !== 'write') return session;
      return { ...session, phase: 'check', marks: [], revealed: false };

    case 'reveal':
      if (session?.phase !== 'check' || session.revealed) return session;
      return { ...session, revealed: true };

    case 'mark': {
      if (session?.phase !== 'check' || !session.revealed) return session;
      const marks = [...session.marks, action.ok];
      const phase = marks.length === session.order.length ? 'summary' : 'check';
      return { ...session, marks, revealed: false, phase };
    }

    case 'undo':
      if (session?.phase !== 'check' || session.marks.length === 0) return session;
      return { ...session, marks: session.marks.slice(0, -1), revealed: true };

    case 'reset':
      return null;

    default:
      return session;
  }
}

export const currentCheckCard = (session) => session.order[session.marks.length];

export const score = (session) => session.marks.filter(Boolean).length;

// Номери позицій (з 1) з позначкою ✗, за зростанням.
export const errorPositions = (session) =>
  session.marks.flatMap((ok, index) => (ok ? [] : [index + 1]));
