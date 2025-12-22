import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProduct, useUpdateProduct, type Product, type ProductType } from '@/hooks/useProducts';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

interface FormData {
  name: string;
  description: string;
  type: ProductType;
  price: string;
  currency: string;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      type: 'one_time',
      price: '',
      currency: 'SEK',
    },
  });

  const productType = watch('type');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || '',
        type: product.type,
        price: (product.price_cents / 100).toString(),
        currency: product.currency,
      });
    } else {
      reset({
        name: '',
        description: '',
        type: 'one_time',
        price: '',
        currency: 'SEK',
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: FormData) => {
    const productData = {
      name: data.name,
      description: data.description || null,
      type: data.type,
      price_cents: Math.round(parseFloat(data.price) * 100),
      currency: data.currency,
      is_active: true,
      sort_order: 0,
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Redigera produkt' : 'Ny produkt'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Namn krävs' })}
              placeholder="t.ex. PezCMS Pro"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Beskriv produkten..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={productType}
              onValueChange={(value: ProductType) => setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">Engångsbetalning</SelectItem>
                <SelectItem value="recurring">Löpande (per månad)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Pris *</Label>
              <Input
                id="price"
                type="number"
                step="1"
                {...register('price', { 
                  required: 'Pris krävs',
                  min: { value: 0, message: 'Pris måste vara positivt' }
                })}
                placeholder="9900"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valuta</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
              {product ? 'Spara' : 'Skapa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
