export interface DishListResponse {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  state: string;
  weight: string;
  dishType: string;
  description: string;
  calories: string;
  proteins: string;
  carbohydrates: string;
  fats: string;
  vitamins: string;
  dietaryTags?: string[];
  status?: 'Confirmed' | 'Rejected' | 'Pending';
}
