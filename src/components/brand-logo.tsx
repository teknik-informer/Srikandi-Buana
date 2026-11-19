type BrandLogoProps={className?:string;iconOnly?:boolean;priority?:boolean;src?:string};
export default function BrandLogo({className='',iconOnly=false,priority=false,src='/brand/wordmark.png'}:BrandLogoProps){
  return (
    <span className={'site-brand '+className}>
      {iconOnly ? (
        <img className="site-brand-emblem" src="/brand/vertical.webp" width={700} height={700} alt="Srikandi Buana" decoding="async" />
      ) : (
        <>
          <img
            className="site-wordmark"
            src={src}
            width={1200}
            height={430}
            alt="Srikandi Buana"
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
          />
          <img className="site-brand-collapsed" src="/brand/vertical.webp" width={700} height={700} alt="" aria-hidden="true" decoding="async" />
        </>
      )}
    </span>
  );
}
