export const getAvatarFallback = (name: string | undefined | null, rankers: any[]) => {
  const safeName = name || 'GUEST';
  const ranker = rankers.find((r: any) => r.display_name === safeName);
  return ranker?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

export const getResponsiveNameClass = (name: string, sizeType: 'small' | 'medium' | 'large') => {
  const len = name?.length || 0;
  const baseClass = 'font-bold text-white transition-colors tracking-normal whitespace-normal break-all leading-tight';
  if (sizeType === 'small') {
    if (len > 12) return `${baseClass} text-xs`;
    if (len > 8) return `${baseClass} text-sm`;
    return `${baseClass} text-base`;
  }
  if (sizeType === 'medium') {
    if (len > 12) return `${baseClass} text-sm`;
    if (len > 8) return `${baseClass} text-base`;
    return `${baseClass} text-xl`;
  }
  if (sizeType === 'large') {
    if (len > 12) return `${baseClass} text-lg`;
    if (len > 8) return `${baseClass} text-2xl`;
    return `${baseClass} text-3xl`;
  }
  return baseClass;
};


