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

    default:
      return session;
  }
}
