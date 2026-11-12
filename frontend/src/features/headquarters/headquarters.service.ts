import api from "../../services/api";
const unwrap = <T,>(r: { data: { data: T } }): T => r.data.data;
export interface Branch { id:string; branchCode:string; name:string; address:string; contactNumber:string; email:string; timeZone:string; isActive:boolean }
export interface Order { id:string; branchId?:string; orderNumber:string; status:string; createdAt:string; subtotal:number|string; discountTotal:number|string; totalAmount:number|string; branch?:{id:string;name:string;branchCode:string}; table?:{tableNumber:string}|null; server?:{firstName:string;lastName:string}|null; items?:Array<{menuItemNameSnapshot:string;quantity:number;lineTotal?:number|string;sides?:Array<{sideNameSnapshot:string}>}> }
export interface MenuCategory { id:string; name:string; description?:string|null; displayOrder?:number|null; isActive:boolean }
export interface MenuItem { id:string; name:string; description?:string|null; price:number|string; imageUrl?:string|null; categoryId:string; category?:{id:string;name:string;isActive?:boolean}; drinkType?:string|null; displayOrder?:number|null; isActive:boolean }
export interface Recipe { id:string; menuItemId:string; menuItem:{id:string;name:string;isActive:boolean;category?:{id:string;name:string;isActive:boolean}}; versions:Array<{id:string;versionNumber:number;status:string;createdAt:string;publishedAt?:string|null;ingredients:Array<{ingredientId:string;quantity:number|string;unit:string;ingredient:{id:string;name:string;unit:string;isActive:boolean}}>}> }
export interface Promotion { id:string; name:string; description?:string|null; discountType:string; discountValue:number|string; startDate:string; endDate:string; isActive:boolean; status?:string; branches?:Array<{branchId:string;branch?:Branch}>; items?:Array<{menuItemId:string;menuItem?:MenuItem}> }
export type ReportRange={period:"today"|"yesterday"|"thisWeek"|"thisMonth"|"lastMonth"|"custom";startDate?:string;endDate?:string};
export const getBranches=async():Promise<Branch[]>=>unwrap(await api.get("/branches"));
export const getBranch=async(id:string):Promise<Branch>=>unwrap(await api.get(`/branches/${id}`));
export const getOrders=async(status?:string):Promise<Order[]>=>unwrap(await api.get("/orders",{params:status?{status}:{}}));
export const getOrder=async(id:string):Promise<Order>=>unwrap(await api.get(`/orders/${id}`));
export const getAllTables=async(branchId?:string)=>unwrap(await api.get("/tables",{params:branchId?{branchId}:{}}));
export const getBranchTables=async(id:string)=>unwrap(await api.get(`/tables/branches/${id}`));
export const getCategories=async():Promise<MenuCategory[]>=>unwrap(await api.get("/menu/categories"));
export const createCategory=async(input:{name:string;description?:string;displayOrder?:number})=>unwrap(await api.post("/menu/categories",input));
export const updateCategory=async(id:string,input:object)=>unwrap(await api.patch(`/menu/categories/${id}`,input));
export const setCategoryActive=async(id:string,active:boolean)=>unwrap(await api.patch(`/menu/categories/${id}/${active?"reactivate":"deactivate"}`));
export const getMenuItems=async():Promise<MenuItem[]>=>unwrap(await api.get("/menu/items"));
export const createMenuItem=async(input:object)=>unwrap(await api.post("/menu/items",input));
export const updateMenuItem=async(id:string,input:object)=>unwrap(await api.patch(`/menu/items/${id}`,input));
export const setMenuItemActive=async(id:string,active:boolean)=>unwrap(await api.patch(`/menu/items/${id}/${active?"reactivate":"deactivate"}`));
export const getMealSides=async(id:string)=>unwrap(await api.get(`/menu/items/${id}/sides`));
export const setMealSides=async(id:string,sideNames:string[])=>unwrap(await api.put(`/menu/items/${id}/sides`,{sideNames}));
export const getBranchAvailability=async(id:string)=>unwrap(await api.get(`/menu/branches/${id}/availability`));
export const updateBranchAvailability=async(branchId:string,itemId:string,isAvailable:boolean,reason?:string)=>unwrap(await api.patch(`/menu/branches/${branchId}/availability/${itemId}`,{isAvailable,reason}));
export const getAvailabilityHistory=async(id:string)=>unwrap(await api.get(`/menu/branches/${id}/availability/history`));
export interface Ingredient { id:string; name:string; unit:string; isActive:boolean; createdAt?:string; updatedAt?:string }
export const getIngredients=async():Promise<Ingredient[]>=>unwrap(await api.get("/inventory/ingredients"));
export const createIngredient=async(input:{name:string;unit:string})=>unwrap(await api.post("/inventory/ingredients",input));
export const updateIngredient=async(id:string,input:{name?:string;unit?:string})=>unwrap(await api.patch(`/inventory/ingredients/${id}`,input));
export const setIngredientActive=async(id:string,active:boolean)=>unwrap(await api.patch(`/inventory/ingredients/${id}/${active?"reactivate":"deactivate"}`));
export const getRecipes=async():Promise<Recipe[]>=>unwrap(await api.get("/recipes"));
export const createRecipe=async(menuItemId:string)=>unwrap(await api.post("/recipes",{menuItemId}));
export const createRecipeVersion=async(id:string)=>unwrap(await api.post(`/recipes/${id}/versions`));
export const setRecipeIngredients=async(recipeId:string,versionId:string,ingredients:Array<{ingredientId:string;quantity:number;unit:string}>)=>unwrap(await api.put(`/recipes/${recipeId}/versions/${versionId}/ingredients`,{ingredients}));
export const publishRecipe=async(recipeId:string,versionId:string)=>unwrap(await api.patch(`/recipes/${recipeId}/versions/${versionId}/publish`));
export const getPromotions=async(branchId?:string):Promise<Promotion[]>=>unwrap(await api.get("/promotions",{params:branchId?{branchId}:{}}));
export const createPromotion=async(input:object)=>unwrap(await api.post("/promotions",input));
export const updatePromotion=async(id:string,input:object)=>unwrap(await api.patch(`/promotions/${id}`,input));
export const deactivatePromotion=async(id:string)=>unwrap(await api.patch(`/promotions/${id}/deactivate`));
export const getSalesReport=async(range:ReportRange,branchId?:string)=>unwrap(await api.get("/reports/sales",{params:{...range,...(branchId?{branchId}:{})}}));
export const getInventoryReport=async(branchId?:string)=>unwrap(await api.get("/reports/inventory",{params:branchId?{branchId}:{}}));
export const getInventoryHistory=async(input:{branchId?:string;startDate?:string;endDate?:string;ingredientId?:string})=>unwrap(await api.get("/reports/inventory/history",{params:input}));