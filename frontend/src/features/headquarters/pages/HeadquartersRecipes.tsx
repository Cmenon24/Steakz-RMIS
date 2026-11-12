import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PlusCircle, Package, Ban, CheckCircle2 } from "lucide-react";
import { getMenuItems, getRecipes, createRecipe, createRecipeVersion, setRecipeIngredients, publishRecipe, getIngredients, createIngredient, setIngredientActive, type MenuItem, type Recipe, type Ingredient } from "../headquarters.service";
import { type AnyRecord, date, errorText, PageTitle, Notice, LoadingError, Card, Status, Button, Modal, SearchInput, Select, Field, inputClass } from "./hq-shared";

type IngredientLine = { ingredientId: string; quantity: string; unit: string };
type IngredientOption = { id: string; name: string; unit: string };

export function HeadquartersRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [catalogue, setCatalogue] = useState<Ingredient[]>([]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("G");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [draftConfirm, setDraftConfirm] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<{ recipe: Recipe; version: Recipe["versions"][number] } | null>(null);
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [recipeRows, menuRows, ingredientRows] = await Promise.all([getRecipes(), getMenuItems(), getIngredients()]);
      setRecipes(recipeRows); setItems(menuRows);
      setCatalogue(ingredientRows);
      setIngredients(ingredientRows.filter(row => row.isActive).map(row => ({ id: row.id, name: row.name, unit: row.unit })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const availableItems = items.filter(item => item.isActive && !recipes.some(recipe => recipe.menuItemId === item.id));
  const versionCount = recipes.reduce((count, recipe) => count + recipe.versions.length, 0);
  const draftCount = recipes.reduce((count, recipe) => count + recipe.versions.filter(version => version.status === "DRAFT").length, 0);
  const publishedCount = recipes.reduce((count, recipe) => count + recipe.versions.filter(version => version.status === "PUBLISHED").length, 0);

  const filtered = useMemo(() => recipes.map(recipe => ({
    ...recipe,
    versions: recipe.versions.filter(version => {
      const category = (recipe.menuItem as AnyRecord).category?.name ?? "";
      const queryMatch = `${recipe.menuItem.name} ${category} version ${version.versionNumber}`.toLowerCase().includes(search.toLowerCase());
      return queryMatch && (statusFilter === "ALL" || version.status === statusFilter);
    }),
  })).filter(recipe => recipe.versions.length > 0), [recipes, search, statusFilter]);

  async function createNewRecipe(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMenuItem) return;
    setBusy(true); setError("");
    try {
      await createRecipe(selectedMenuItem);
      setNotice("Recipe created with its first draft version. Add ingredients before publishing.");
      setCreateOpen(false); setSelectedMenuItem(""); await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function createDraft() {
    if (!draftConfirm) return;
    setBusy(true); setError("");
    try {
      await createRecipeVersion(draftConfirm.id);
      setNotice("New draft version created. It remains separate from the currently published version.");
      setDraftConfirm(null); await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  function openIngredientEditor(recipe: Recipe, version: Recipe["versions"][number]) {
    setIngredientLines(version.ingredients.map(line => ({ ingredientId: line.ingredientId, quantity: String(line.quantity), unit: line.unit })));
    setEditing({ recipe, version }); setError("");
  }

  function changeIngredient(index: number, ingredientId: string) {
    const selectedIngredient = ingredients.find(ingredient => ingredient.id === ingredientId);
    setIngredientLines(current => current.map((line, i) => i === index ? { ...line, ingredientId, unit: selectedIngredient?.unit ?? line.unit } : line));
  }

  async function saveIngredients(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const payload = ingredientLines.filter(line => line.ingredientId && line.quantity !== "").map(line => ({ ingredientId: line.ingredientId, quantity: Number(line.quantity), unit: line.unit }));
    if (!payload.length || payload.some(line => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      setError("Add at least one ingredient and enter a positive quantity for every line."); return;
    }
    if (new Set(payload.map(line => line.ingredientId)).size !== payload.length) {
      setError("Each ingredient can only appear once in a recipe version."); return;
    }
    setBusy(true);
    try {
      await setRecipeIngredients(editing.recipe.id, editing.version.id, payload);
      setNotice(`Ingredients saved for Version ${editing.version.versionNumber}.`);
      setEditing(null); await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function addIngredient(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await createIngredient({ name: newIngredientName.trim(), unit: newIngredientUnit });
      setNewIngredientName(""); setNewIngredientUnit("G");
      setNotice("Ingredient added to the central catalogue.");
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function toggleIngredient(ingredient: Ingredient) {
    if (!confirm(`${ingredient.isActive ? "Deactivate" : "Reactivate"} ${ingredient.name}?`)) return;
    setBusy(true); setError("");
    try { await setIngredientActive(ingredient.id, !ingredient.isActive); setNotice(`${ingredient.name} ${ingredient.isActive ? "deactivated" : "reactivated"}.`); await load(); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function publish(recipe: Recipe, version: Recipe["versions"][number]) {
    if (!confirm(`Publish Version ${version.versionNumber} for ${recipe.menuItem.name}? This archives the previous published version; existing orders keep their saved recipe snapshot.`)) return;
    setBusy(true); setError("");
    try {
      await publishRecipe(recipe.id, version.id);
      setNotice(`Version ${version.versionNumber} published. Existing orders remain unchanged.`);
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  return <>
    <PageTitle title="Recipe Management" subtitle="Create and maintain immutable, versioned recipes for menu items." action={<div className="flex flex-wrap gap-2"><Button variant="light" onClick={() => setCatalogueOpen(true)}><Package size={15}/>Manage ingredients</Button><Button onClick={() => { setSelectedMenuItem(availableItems[0]?.id ?? ""); setCreateOpen(true); }}><Plus size={15}/>Create recipe</Button></div>}/>
    <Notice message={notice} onDismiss={() => setNotice("")}/><Notice message={error} error onDismiss={() => setError("")}/>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Card><p className="text-sm text-gray-500">Recipes</p><p className="mt-1 text-2xl font-bold">{recipes.length}</p></Card><Card><p className="text-sm text-gray-500">Draft versions</p><p className="mt-1 text-2xl font-bold text-amber-700">{draftCount}</p></Card><Card><p className="text-sm text-gray-500">Published versions</p><p className="mt-1 text-2xl font-bold text-green-700">{publishedCount}</p><p className="text-xs text-gray-500">{versionCount} total versions</p></Card></div>
    <div className="mb-4 flex flex-wrap gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Search menu item, category or version"/><Select value={statusFilter} onChange={setStatusFilter}><option value="ALL">All version statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></Select></div>
    <LoadingError loading={loading} error={error && !recipes.length ? error : ""} retry={() => void load()}/>
    {!loading && <div className="space-y-4">{filtered.map(recipe => <Card key={recipe.id}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{recipe.menuItem.name}</h2><p className="mt-1 text-xs text-gray-500">{(recipe.menuItem as AnyRecord).category?.name ?? "Menu item"} · {recipe.versions.length} matching version(s)</p></div><Button variant="light" onClick={() => setDraftConfirm(recipe)}><Plus size={15}/>New draft version</Button></div>
      <div className="mt-4 space-y-3">{recipe.versions.map(version => <div key={version.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-semibold">Version {version.versionNumber}</span><Status value={version.status}/></div><span className="text-xs text-gray-500">Created {date(version.createdAt)}{version.publishedAt ? ` · Published ${date(version.publishedAt)}` : ""}</span></div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{version.ingredients.map(line => <div key={line.ingredientId} className="rounded-md bg-white px-3 py-2 text-sm text-gray-700">{line.ingredient.name} · {line.quantity} {line.unit}</div>)}{!version.ingredients.length && <p className="text-xs text-gray-500">No ingredients configured.</p>}</div>
        {version.status === "DRAFT" && <div className="mt-4 flex flex-wrap gap-2"><Button variant="light" onClick={() => openIngredientEditor(recipe, version)}><Pencil size={14}/>Edit ingredients</Button><Button onClick={() => void publish(recipe, version)} disabled={busy}>Publish version</Button></div>}
      </div>)}</div>
    </Card>)}{!filtered.length && <Card><p className="text-center text-sm text-gray-500">No recipes or versions match these filters.</p></Card>}</div>}
    <p className="mt-4 text-xs leading-5 text-gray-500">Create recipe is used once for a menu item that does not have a recipe. New draft version is used when an existing recipe needs a future change. Only drafts can be edited; published versions are immutable and old orders retain their original recipe snapshot. The current backend does not expose a draft-delete endpoint, so Cancel closes the creation/editor dialog before saving; a created draft cannot currently be deleted from this screen.</p>

    {catalogueOpen && <Modal title="Central ingredient catalogue" close={() => setCatalogueOpen(false)} size="max-w-3xl">
      <p className="mb-4 text-sm text-gray-600">Add ingredients here before selecting them in a recipe. Units are shared across branches and cannot be changed casually once used in published recipes.</p>
      <form onSubmit={event => void addIngredient(event)} className="mb-5 grid grid-cols-1 items-end gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_150px_auto]">
        <Field label="New ingredient name"><input required minLength={2} maxLength={100} className={inputClass} value={newIngredientName} onChange={event => setNewIngredientName(event.target.value)} placeholder="e.g. Olive oil"/></Field>
        <Field label="Inventory unit"><select className={inputClass} value={newIngredientUnit} onChange={event => setNewIngredientUnit(event.target.value)}>{["G","KG","ML","L","CAN","BOTTLE","GLASS","PIECE","PORTION"].map(unit => <option key={unit}>{unit}</option>)}</select></Field>
        <Button type="submit" disabled={busy}><Plus size={14}/>Add ingredient</Button>
      </form>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Ingredient</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead><tbody className="divide-y">{catalogue.map(ingredient => <tr key={ingredient.id}><td className="px-3 py-2 font-medium">{ingredient.name}</td><td className="px-3 py-2">{ingredient.unit}</td><td className="px-3 py-2"><Status value={ingredient.isActive ? "ACTIVE" : "INACTIVE"}/></td><td className="px-3 py-2"><Button variant="light" disabled={busy} onClick={() => void toggleIngredient(ingredient)}>{ingredient.isActive ? <><Ban size={14}/>Deactivate</> : <><CheckCircle2 size={14}/>Reactivate</>}</Button></td></tr>)}{!catalogue.length && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No ingredients have been added yet.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex justify-end"><Button variant="light" onClick={() => setCatalogueOpen(false)}>Close</Button></div>
    </Modal>}

    {createOpen && <Modal title="Create recipe" close={() => setCreateOpen(false)}>
      <form onSubmit={event => void createNewRecipe(event)} className="space-y-4">
        <p className="text-sm text-gray-600">Create the first draft recipe for an active menu item that does not already have a recipe.</p>
        {availableItems.length ? <Field label="Menu item"><select required className={inputClass} value={selectedMenuItem} onChange={event => setSelectedMenuItem(event.target.value)}>{availableItems.map(item => <option key={item.id} value={item.id}>{item.name} · {(item.category as AnyRecord | undefined)?.name ?? "Menu item"}</option>)}</select></Field> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Every active menu item already has a recipe, or there are no active menu items. Add or activate a menu item first if you need another recipe.</p>}
        <div className="flex justify-end gap-2"><Button variant="light" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={!availableItems.length || busy}>Create recipe</Button></div>
      </form>
    </Modal>}

    {draftConfirm && <Modal title="Create new draft version" close={() => setDraftConfirm(null)}>
      <p className="text-sm leading-6 text-gray-700">Create the next draft version for <strong>{draftConfirm.menuItem.name}</strong>? The currently published recipe will remain in use until the new draft is completed and published.</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="light" onClick={() => setDraftConfirm(null)}>Cancel</Button><Button onClick={() => void createDraft()} disabled={busy}>Create draft version</Button></div>
    </Modal>}

    {editing && <Modal title={`Edit ingredients · ${editing.recipe.menuItem.name} · Version ${editing.version.versionNumber}`} close={() => setEditing(null)} size="max-w-3xl">
      <form onSubmit={event => void saveIngredients(event)} className="space-y-4">
        <p className="text-sm text-gray-600">Choose ingredients from the central ingredient catalogue. Units are fixed by each ingredient's inventory unit.</p>
        {ingredientLines.map((line, index) => {
          const selectedIngredient = ingredients.find(ingredient => ingredient.id === line.ingredientId);
          return <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_120px_100px_40px]">
            <Field label="Ingredient"><select required className={inputClass} value={line.ingredientId} onChange={event => changeIngredient(index, event.target.value)}><option value="">Select ingredient</option>{ingredients.map(ingredient => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>)}</select></Field>
            <Field label="Quantity"><input required type="number" min="0.001" step="0.001" className={inputClass} value={line.quantity} onChange={event => setIngredientLines(current => current.map((item, i) => i === index ? { ...item, quantity: event.target.value } : item))}/></Field>
            <Field label="Unit"><input readOnly className={`${inputClass} bg-gray-100`} value={selectedIngredient?.unit ?? line.unit}/></Field>
            <button type="button" aria-label="Remove ingredient" onClick={() => setIngredientLines(current => current.filter((_, i) => i !== index))} className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600"><Trash2 size={16}/></button>
          </div>;
        })}
        <Button variant="light" onClick={() => setIngredientLines(current => [...current, { ingredientId: "", quantity: "", unit: "" }])}><PlusCircle size={15}/>Add ingredient</Button>
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="light" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>Save ingredients</Button></div>
      </form>
    </Modal>}
  </>;
}
