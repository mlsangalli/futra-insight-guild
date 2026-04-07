import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
  fallbackSrc?: string;
}

export function OptimizedImage({
  webpSrc,
  fallbackSrc,
  src,
  alt = '',
  className,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: OptimizedImageProps) {
  if (webpSrc || fallbackSrc) {
    return (
      <picture>
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          src={fallbackSrc || src}
          alt={alt}
          className={cn(className)}
          loading={loading}
          decoding={decoding}
          {...props}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className)}
      loading={loading}
      decoding={decoding}
      {...props}
    />
  );
}
