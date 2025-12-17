import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageBlockData } from '@/types/cms';
import { ImageIcon } from 'lucide-react';
import { ImageUploader } from '../ImageUploader';
import { useBlockEditor } from '@/hooks/useBlockEditor';

interface ImageBlockEditorProps {
  data: ImageBlockData;
  onChange: (data: ImageBlockData) => void;
  isEditing: boolean;
}

export function ImageBlockEditor({ data, onChange, isEditing }: ImageBlockEditorProps) {
  const { data: blockData, updateField } = useBlockEditor({
    initialData: data,
    onChange,
  });

  if (isEditing) {
    return (
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <ImageUploader
          value={blockData.src || ''}
          onChange={(url) => updateField('src', url)}
          label="Image"
        />
        <div className="space-y-2">
          <Label htmlFor="image-alt">Alt text (accessibility)</Label>
          <Input
            id="image-alt"
            value={blockData.alt || ''}
            onChange={(e) => updateField('alt', e.target.value)}
            placeholder="Description of the image"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image-caption">Caption (optional)</Label>
          <Input
            id="image-caption"
            value={blockData.caption || ''}
            onChange={(e) => updateField('caption', e.target.value)}
            placeholder="Caption below the image"
          />
        </div>
      </div>
    );
  }

  // Preview mode
  if (!blockData.src) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/30">
        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No image selected</p>
      </div>
    );
  }

  return (
    <figure className="rounded-lg overflow-hidden">
      <img
        src={blockData.src}
        alt={blockData.alt || ''}
        className="w-full h-auto object-cover"
      />
      {blockData.caption && (
        <figcaption className="text-sm text-muted-foreground text-center py-2 bg-muted/30">
          {blockData.caption}
        </figcaption>
      )}
    </figure>
  );
}
