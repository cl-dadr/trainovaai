import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Megaphone, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface SponsoredProduct {
  id: string;
  brand_name: string;
  product_name: string;
  description: string | null;
  image_url: string | null;
  cta_text: string;
  cta_url: string;
  price: number | null;
  badge: string | null;
  active: boolean;
  priority: number;
}

const emptySponsored = {
  brand_name: "",
  product_name: "",
  description: "",
  image_url: "",
  cta_text: "Shop Now",
  cta_url: "",
  price: 0,
  badge: "",
  active: true,
  priority: 0,
};

const AdminSponsoredPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<SponsoredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(emptySponsored);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("sponsored_products").select("*").order("priority", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing.brand_name || !editing.product_name || !editing.cta_url) {
      toast({ title: "Brand, product name and CTA URL are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      brand_name: editing.brand_name,
      product_name: editing.product_name,
      description: editing.description || null,
      image_url: editing.image_url || null,
      cta_text: editing.cta_text || "Shop Now",
      cta_url: editing.cta_url,
      price: editing.price || null,
      badge: editing.badge || null,
      active: editing.active,
      priority: editing.priority || 0,
    };

    if (editId) {
      await (supabase as any).from("sponsored_products").update(payload).eq("id", editId);
      toast({ title: "Sponsored product updated" });
    } else {
      await (supabase as any).from("sponsored_products").insert(payload);
      toast({ title: "Sponsored product added" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditId(null);
    setEditing(emptySponsored);
    fetchItems();
  };

  const handleEdit = (p: SponsoredProduct) => {
    setEditId(p.id);
    setEditing({
      brand_name: p.brand_name,
      product_name: p.product_name,
      description: p.description || "",
      image_url: p.image_url || "",
      cta_text: p.cta_text,
      cta_url: p.cta_url,
      price: p.price || 0,
      badge: p.badge || "",
      active: p.active,
      priority: p.priority,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sponsored product?")) return;
    await (supabase as any).from("sponsored_products").delete().eq("id", id);
    toast({ title: "Sponsored product deleted" });
    fetchItems();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await (supabase as any).from("sponsored_products").update({ active: !active }).eq("id", id);
    fetchItems();
  };

  if (loading) {
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
            <h1 className="text-base font-bold text-foreground font-display">Sponsored Products</h1>
            <p className="text-[10px] text-muted-foreground">{items.length} brand ads</p>
          </div>
          <Button onClick={() => { setEditId(null); setEditing(emptySponsored); setDialogOpen(true); }} size="sm" className="ml-auto gap-1 gradient-primary text-primary-foreground text-xs">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-16">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No sponsored products yet. Add brand partnerships!</p>
          </div>
        )}
        {items.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className={`bg-card border-border/40 ${!p.active ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 flex gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.product_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-neon-orange uppercase">{p.brand_name} • SPONSORED</p>
                      <h4 className="text-xs font-bold text-foreground truncate">{p.product_name}</h4>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggle(p.id, p.active)} className={`p-1.5 rounded-lg text-[8px] font-bold ${p.active ? 'bg-primary/20 text-primary' : 'bg-secondary/50 text-muted-foreground'}`}>
                        {p.active ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary">
                        <Pencil className="h-3 w-3 text-primary" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-destructive/20">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.price && <span className="text-sm font-black text-foreground">₹{p.price}</span>}
                    {p.badge && <span className="text-[8px] font-bold gradient-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                    <a href={p.cta_url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-[9px] text-primary">
                      <ExternalLink className="h-3 w-3" /> {p.cta_text}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editId ? "Edit Sponsored Product" : "Add Sponsored Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs text-muted-foreground">Brand Name *</Label>
              <Input value={editing.brand_name} onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })} placeholder="Nike, Adidas, etc." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Product Name *</Label>
              <Input value={editing.product_name} onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} placeholder="Air Max 2026" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Premium running shoes" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Image URL</Label>
              <Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">CTA Text</Label>
                <Input value={editing.cta_text} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} placeholder="Shop Now" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CTA URL *</Label>
                <Input value={editing.cta_url} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} placeholder="https://brand.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Badge</Label>
                <Input value={editing.badge} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} placeholder="SPONSORED" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Priority (higher = first)</Label>
                <Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="rounded" />
                <Label className="text-xs text-muted-foreground">Active</Label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Update" : "Add Sponsored Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSponsoredPage;
