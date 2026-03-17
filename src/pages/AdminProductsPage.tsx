import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  badge: string | null;
  in_stock: boolean;
}

const CATEGORIES = ["equipment", "shoes", "clothes", "bags", "bottles", "shakers", "supplements", "accessories"];

const emptyProduct = {
  name: "",
  description: "",
  price: 0,
  original_price: 0,
  image_url: "",
  category: "equipment",
  badge: "",
  in_stock: true,
};

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(emptyProduct);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/");
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingProduct.name || editingProduct.price <= 0) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: editingProduct.name,
      description: editingProduct.description || null,
      price: editingProduct.price,
      original_price: editingProduct.original_price || null,
      image_url: editingProduct.image_url || null,
      category: editingProduct.category,
      badge: editingProduct.badge || null,
      in_stock: editingProduct.in_stock,
    };

    if (editId) {
      await (supabase as any).from("products").update(payload).eq("id", editId);
      toast({ title: "Product updated" });
    } else {
      await (supabase as any).from("products").insert(payload);
      toast({ title: "Product added" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditId(null);
    setEditingProduct(emptyProduct);
    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setEditingProduct({
      name: p.name,
      description: p.description || "",
      price: p.price,
      original_price: p.original_price || 0,
      image_url: p.image_url || "",
      category: p.category,
      badge: p.badge || "",
      in_stock: p.in_stock,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await (supabase as any).from("products").delete().eq("id", id);
    toast({ title: "Product deleted" });
    fetchProducts();
  };

  const openNewDialog = () => {
    setEditId(null);
    setEditingProduct(emptyProduct);
    setDialogOpen(true);
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-1.5 rounded-xl bg-secondary/50">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground font-display">Manage Products</h1>
            <p className="text-[10px] text-muted-foreground">{products.length} products</p>
          </div>
          <Button onClick={openNewDialog} size="sm" className="ml-auto gap-1 gradient-primary text-primary-foreground text-xs">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {products.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products yet. Add your first product!</p>
          </div>
        )}
        {products.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="bg-card border-border/40">
              <CardContent className="p-3 flex gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground truncate">{p.name}</h4>
                      <p className="text-[10px] text-muted-foreground capitalize">{p.category}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary">
                        <Pencil className="h-3 w-3 text-primary" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-destructive/20">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-black text-foreground">₹{p.price}</span>
                    {p.original_price && <span className="text-[10px] text-muted-foreground line-through">₹{p.original_price}</span>}
                    {p.badge && <span className="text-[8px] font-bold gradient-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                    {!p.in_stock && <span className="text-[8px] text-destructive font-bold">OUT OF STOCK</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder="Nike Running Shoes" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} placeholder="Lightweight cushioned shoes" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Price (₹) *</Label>
                <Input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Original Price (₹)</Label>
                <Input type="number" value={editingProduct.original_price} onChange={(e) => setEditingProduct({ ...editingProduct, original_price: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Image URL</Label>
              <Input value={editingProduct.image_url} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={editingProduct.category} onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Badge</Label>
                <Input value={editingProduct.badge} onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })} placeholder="BESTSELLER" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editingProduct.in_stock} onChange={(e) => setEditingProduct({ ...editingProduct, in_stock: e.target.checked })} className="rounded" />
              <Label className="text-xs text-muted-foreground">In Stock</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;
