import { Link } from 'react-router-dom';
import { FeaturesBlockData } from '@/types/cms';
import { icons } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturesBlockProps {
  data: FeaturesBlockData;
}

function FeatureIcon({ 
  iconName, 
  iconStyle 
}: { 
  iconName: string; 
  iconStyle: 'circle' | 'square' | 'none';
}) {
  const LucideIcon = icons[iconName as keyof typeof icons];
  
  if (!LucideIcon) return null;

  const baseClasses = "h-6 w-6 text-primary";
  
  if (iconStyle === 'none') {
    return <LucideIcon className={cn(baseClasses, "h-8 w-8")} />;
  }

  const containerClasses = cn(
    "flex items-center justify-center w-12 h-12",
    iconStyle === 'circle' && "rounded-full",
    iconStyle === 'square' && "rounded-lg",
    "bg-primary/10"
  );

  return (
    <div className={containerClasses}>
      <LucideIcon className={baseClasses} />
    </div>
  );
}

function FeatureCard({
  feature,
  variant,
  iconStyle,
  showLinks,
}: {
  feature: FeaturesBlockData['features'][0];
  variant: FeaturesBlockData['variant'];
  iconStyle: FeaturesBlockData['iconStyle'];
  showLinks: boolean;
}) {
  const content = (
    <>
      <FeatureIcon iconName={feature.icon} iconStyle={iconStyle || 'circle'} />
      <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
        {feature.description}
      </p>
    </>
  );

  const baseClasses = cn(
    "group",
    variant === 'cards' && "p-6 rounded-xl border bg-card hover:shadow-md transition-shadow",
    variant === 'minimal' && "text-left",
    variant === 'centered' && "text-center flex flex-col items-center",
    variant === 'default' && "text-left"
  );

  const isExternalLink = feature.url?.startsWith('http');
  const hasLink = showLinks && feature.url;

  if (hasLink) {
    if (isExternalLink) {
      return (
        <a
          href={feature.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseClasses, "block hover:text-primary transition-colors")}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        to={feature.url!}
        className={cn(baseClasses, "block hover:text-primary transition-colors")}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export function FeaturesBlock({ data }: FeaturesBlockProps) {
  const features = data.features || [];
  const columns = data.columns || 3;
  const layout = data.layout || 'grid';
  const variant = data.variant || 'default';
  const iconStyle = data.iconStyle || 'circle';
  const showLinks = data.showLinks ?? true;

  if (features.length === 0) return null;

  const gridClasses = cn(
    layout === 'grid' && {
      'grid gap-8': true,
      'sm:grid-cols-2': columns >= 2,
      'lg:grid-cols-3': columns >= 3,
      'xl:grid-cols-4': columns === 4,
    },
    layout === 'list' && "space-y-6"
  );

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {(data.title || data.subtitle) && (
          <div className={cn(
            "mb-12",
            variant === 'centered' && "text-center"
          )}>
            {data.title && (
              <h2 className="text-3xl font-bold tracking-tight">{data.title}</h2>
            )}
            {data.subtitle && (
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        <div className={gridClasses}>
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              variant={variant}
              iconStyle={iconStyle}
              showLinks={showLinks}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
