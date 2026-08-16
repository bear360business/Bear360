import type { MenuCategory, MenuItem } from '../types'

// Real food photography — Unsplash + Pexels hotlinks. Every photo ID below was
// downloaded and visually verified against its dish; similar dishes may share one.
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=80`
const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=640`

const photo = {
  curryRiceKadhais: unsplash('1585937421612-70a008356fbe'), // veg curries + steamed rice
  steelThali: unsplash('1546833999-b9f581a1996d'), // thali: paratha, dal, sabzi
  darkCurryNaan: unsplash('1565557623262-b51c2513a641'), // rich red curry + naan
  hydBiryaniPlate: unsplash('1589302168068-964664d93dc0'), // biryani + salan + raita
  idliVadaSambar: unsplash('1630383249896-424e482df921'), // idli, vada, sambar plate
  samosaChutney: unsplash('1601050690597-df0568f70950'), // samosas + green chutney
  pavBhajiDark: unsplash('1606491956689-2ea866880c84'), // buttered pav + bhaji
  tandooriLegs: unsplash('1626074353765-517a681e40be'), // charred tandoori chicken
  greenMasalaKadhai: unsplash('1596797038530-2c107229654b'), // coriander-topped kadhai
  bananaLeafMeal: unsplash('1625398407796-82650a8c135f'), // banana-leaf meal, papad
  muttonPulaoPlatter: unsplash('1633945274405-b6c8069047b0'), // festive mutton pulao
  makhaniGravy: unsplash('1603894584373-5ac82b2ae398'), // butter-chicken makhani
  idliBananaLeaf: unsplash('1589301760014-d929f3979dbc'), // idli on banana leaf
  spicedChickenBowl: unsplash('1604908176997-125f25cc6f3d'), // wok-tossed chicken
  friedSweetsMalai: unsplash('1666190092159-3171cf0fbb12'), // cream-filled fried sweets
  curdRiceBowl: unsplash('1633383718081-22ac93e3db65'), // curd rice, pomegranate, papad
  iceCreamCone: unsplash('1497034825429-c343d7c6a68f'), // kulfi-style scoops
  milkTeaCup: unsplash('1544787219-7f47ccb76574'), // milky tea
  lemonadeGlasses: unsplash('1523677011781-c91d1bbe2f9e'), // fresh lime coolers
  mangoDrink: unsplash('1600271886742-f049cd451bba'), // tall mango cooler
  chickenBiryaniLegs: pexels(1624487), // biryani with chicken legs
  copperKadhaiNaan: pexels(2474661), // copper kadhai curry + naan
  pavBhajiThali: pexels(5410400), // pav bhaji platter, lime, onions
  biryaniRaitaBowl: pexels(12737656), // biryani bowl + raita + chutney
  dosaRolls: pexels(5560763), // crisp dosa rolls, banana leaf
  paneerGravyBowl: pexels(9609838), // paneer cubes in orange gravy
  friedSnackBasket: pexels(14477873), // crisp snacks basket + chutneys
  garlicNaanKofta: pexels(7625056), // garlic naan basket + kofta curry
  creamySpicedDrink: pexels(5946623), // thick lassi-style drink
  naanBasket: pexels(1117862), // naan/kulcha bread basket
  cornKoftaKadhai: pexels(2679501), // creamy kofta kadhai
  rawaIdliChilli: pexels(4331491), // griddled rice cakes + chilli
  gulabJamunBowl: pexels(7449105), // gulab jamun in syrup
}

/** Fixture catalogue (demo only — live arrays start empty for API mode). */
export const menuCategoryFixtures: MenuCategory[] = [
  { id: 'starters', name: 'Starters', emoji: '🥘', sortOrder: 1 },
  { id: 'north-indian', name: 'North Indian', emoji: '🍛', sortOrder: 2 },
  { id: 'south-indian', name: 'South Indian', emoji: '🥥', sortOrder: 3 },
  { id: 'breads', name: 'Breads', emoji: '🫓', sortOrder: 4 },
  { id: 'rice-biryani', name: 'Rice & Biryani', emoji: '🍚', sortOrder: 5 },
  { id: 'street-food', name: 'Street Food', emoji: '🌶️', sortOrder: 6 },
  { id: 'desserts', name: 'Desserts', emoji: '🍮', sortOrder: 7 },
  { id: 'beverages', name: 'Beverages', emoji: '🍹', sortOrder: 8 },
]

export const menuItemFixtures: MenuItem[] = [
  // Starters
  { id: 'paneer-tikka', categoryId: 'starters', name: 'Paneer Tikka', description: 'Char-grilled cottage cheese, mint chutney', price: 249, veg: true, spicy: true, available: true, image: photo.paneerGravyBowl, popular: true },
  { id: 'chicken-tikka', categoryId: 'starters', name: 'Chicken Tikka', description: 'Smoky tandoor-grilled chicken, onion rings', price: 299, veg: false, spicy: true, available: true, image: photo.tandooriLegs },
  { id: 'samosa', categoryId: 'starters', name: 'Punjabi Samosa (2 pc)', description: 'Crisp pastry, spiced potato-pea filling', price: 79, veg: true, spicy: false, available: true, image: photo.samosaChutney },
  { id: 'veg-pakora', categoryId: 'starters', name: 'Mixed Veg Pakora', description: 'Monsoon-style fritters, best with chai', price: 149, veg: true, spicy: false, available: true, image: photo.friedSnackBasket },
  { id: 'hara-bhara-kabab', categoryId: 'starters', name: 'Hara Bhara Kabab', description: 'Spinach & green-pea patties, yogurt dip', price: 199, veg: true, spicy: false, available: true, image: photo.greenMasalaKadhai },
  { id: 'tandoori-chicken', categoryId: 'starters', name: 'Tandoori Chicken (Half)', description: 'Yogurt-marinated, charred in the tandoor', price: 349, veg: false, spicy: true, available: true, image: photo.tandooriLegs },
  { id: 'seekh-kebab', categoryId: 'starters', name: 'Mutton Seekh Kebab', description: 'Minced mutton skewers, kachumber salad', price: 329, veg: false, spicy: true, available: false, image: photo.tandooriLegs },
  // North Indian
  { id: 'butter-chicken', categoryId: 'north-indian', name: 'Butter Chicken', description: 'Tomato-makhani gravy, kasuri methi', price: 349, veg: false, spicy: false, available: true, image: photo.makhaniGravy, popular: true },
  { id: 'paneer-butter-masala', categoryId: 'north-indian', name: 'Paneer Butter Masala', description: 'Silky tomato-cashew gravy, malai paneer', price: 299, veg: true, spicy: false, available: true, image: photo.paneerGravyBowl, popular: true },
  { id: 'dal-makhani', categoryId: 'north-indian', name: 'Dal Makhani', description: 'Black lentils simmered overnight, cream', price: 249, veg: true, spicy: false, available: true, image: photo.copperKadhaiNaan },
  { id: 'palak-paneer', categoryId: 'north-indian', name: 'Palak Paneer', description: 'Spinach purée, garlic tadka, soft paneer', price: 279, veg: true, spicy: false, available: true, image: photo.greenMasalaKadhai },
  { id: 'amritsari-chole', categoryId: 'north-indian', name: 'Amritsari Chole', description: 'Dark chickpea curry, anardana masala', price: 199, veg: true, spicy: true, available: true, image: photo.steelThali },
  { id: 'rogan-josh', categoryId: 'north-indian', name: 'Mutton Rogan Josh', description: 'Kashmiri chilli, slow-cooked on the bone', price: 379, veg: false, spicy: true, available: true, image: photo.darkCurryNaan },
  { id: 'malai-kofta', categoryId: 'north-indian', name: 'Malai Kofta', description: 'Fried paneer-potato dumplings, rich gravy', price: 289, veg: true, spicy: false, available: true, image: photo.cornKoftaKadhai },
  { id: 'kadhai-chicken', categoryId: 'north-indian', name: 'Kadhai Chicken', description: 'Wok-tossed with peppers, crushed coriander', price: 329, veg: false, spicy: true, available: true, image: photo.spicedChickenBowl },
  // South Indian
  { id: 'masala-dosa', categoryId: 'south-indian', name: 'Masala Dosa', description: 'Crisp rice crêpe, potato masala, sambar', price: 149, veg: true, spicy: false, available: true, image: photo.dosaRolls, popular: true },
  { id: 'idli-sambar', categoryId: 'south-indian', name: 'Idli Sambar (3 pc)', description: 'Steamed rice cakes, gunpowder, chutneys', price: 99, veg: true, spicy: false, available: true, image: photo.idliBananaLeaf },
  { id: 'medu-vada', categoryId: 'south-indian', name: 'Medu Vada (2 pc)', description: 'Crisp urad-dal doughnuts, coconut chutney', price: 109, veg: true, spicy: false, available: true, image: photo.idliVadaSambar },
  { id: 'onion-uttapam', categoryId: 'south-indian', name: 'Onion Uttapam', description: 'Thick griddle pancake, onion & chilli', price: 139, veg: true, spicy: true, available: true, image: photo.rawaIdliChilli },
  { id: 'chicken-chettinad', categoryId: 'south-indian', name: 'Chicken Chettinad', description: 'Fiery black-pepper masala from Tamil Nadu', price: 329, veg: false, spicy: true, available: true, image: photo.darkCurryNaan },
  // Breads
  { id: 'butter-naan', categoryId: 'breads', name: 'Butter Naan', description: 'Tandoor-blistered, brushed with butter', price: 59, veg: true, spicy: false, available: true, image: photo.naanBasket },
  { id: 'garlic-naan', categoryId: 'breads', name: 'Garlic Naan', description: 'Chopped garlic, coriander, ghee', price: 79, veg: true, spicy: false, available: true, image: photo.garlicNaanKofta },
  { id: 'tandoori-roti', categoryId: 'breads', name: 'Tandoori Roti', description: 'Whole-wheat, straight off the clay oven', price: 35, veg: true, spicy: false, available: true, image: photo.naanBasket },
  { id: 'laccha-paratha', categoryId: 'breads', name: 'Laccha Paratha', description: 'Flaky layered paratha, crisp edges', price: 69, veg: true, spicy: false, available: true, image: photo.steelThali },
  { id: 'cheese-naan', categoryId: 'breads', name: 'Cheese Naan', description: 'Molten Amul cheese stuffing', price: 99, veg: true, spicy: false, available: false, image: photo.garlicNaanKofta },
  // Rice & Biryani
  { id: 'chicken-biryani', categoryId: 'rice-biryani', name: 'Hyderabadi Chicken Biryani', description: 'Dum-cooked, saffron, mirchi ka salan, raita', price: 329, veg: false, spicy: true, available: true, image: photo.hydBiryaniPlate, popular: true },
  { id: 'mutton-biryani', categoryId: 'rice-biryani', name: 'Mutton Biryani', description: 'Long-grain basmati, slow dum, boiled egg', price: 399, veg: false, spicy: true, available: true, image: photo.muttonPulaoPlatter },
  { id: 'veg-biryani', categoryId: 'rice-biryani', name: 'Veg Dum Biryani', description: 'Seasonal vegetables, mint, fried onions', price: 249, veg: true, spicy: true, available: true, image: photo.biryaniRaitaBowl },
  { id: 'jeera-rice', categoryId: 'rice-biryani', name: 'Jeera Rice', description: 'Cumin-tempered steamed basmati', price: 149, veg: true, spicy: false, available: true, image: photo.curryRiceKadhais },
  { id: 'curd-rice', categoryId: 'rice-biryani', name: 'Curd Rice', description: 'South-style thayir sadam, pomegranate', price: 129, veg: true, spicy: false, available: true, image: photo.curdRiceBowl },
  // Street Food
  { id: 'pani-puri', categoryId: 'street-food', name: 'Pani Puri (8 pc)', description: 'Crisp puris, spiced jaljeera, ragda', price: 99, veg: true, spicy: true, available: true, image: photo.friedSnackBasket },
  { id: 'pav-bhaji', categoryId: 'street-food', name: 'Pav Bhaji', description: 'Mumbai-style mashed veg, buttered pav', price: 149, veg: true, spicy: true, available: true, image: photo.pavBhajiThali, popular: true },
  { id: 'vada-pav', categoryId: 'street-food', name: 'Vada Pav', description: 'Batata vada, dry garlic chutney, pav', price: 59, veg: true, spicy: true, available: true, image: photo.pavBhajiDark },
  { id: 'bhel-puri', categoryId: 'street-food', name: 'Bhel Puri', description: 'Puffed rice, tamarind & mint chutneys', price: 109, veg: true, spicy: false, available: true, image: photo.bananaLeafMeal },
  { id: 'dahi-puri', categoryId: 'street-food', name: 'Dahi Puri (6 pc)', description: 'Chilled yogurt, boondi, sev, chutneys', price: 119, veg: true, spicy: false, available: false, image: photo.friedSnackBasket },
  { id: 'paneer-kathi-roll', categoryId: 'street-food', name: 'Paneer Kathi Roll', description: 'Flaky paratha wrap, tikka masala paneer', price: 179, veg: true, spicy: true, available: true, image: photo.dosaRolls },
  // Desserts
  { id: 'gulab-jamun', categoryId: 'desserts', name: 'Gulab Jamun (2 pc)', description: 'Warm khoya dumplings, rose syrup', price: 99, veg: true, spicy: false, available: true, image: photo.gulabJamunBowl, popular: true },
  { id: 'rasmalai', categoryId: 'desserts', name: 'Rasmalai (2 pc)', description: 'Saffron milk, pistachio, soft chhena', price: 129, veg: true, spicy: false, available: true, image: photo.friedSweetsMalai },
  { id: 'gajar-halwa', categoryId: 'desserts', name: 'Gajar ka Halwa', description: 'Slow-cooked carrot, ghee, dry fruits', price: 149, veg: true, spicy: false, available: true, image: photo.gulabJamunBowl },
  { id: 'kulfi-falooda', categoryId: 'desserts', name: 'Kulfi Falooda', description: 'Malai kulfi, vermicelli, rose, basil seeds', price: 119, veg: true, spicy: false, available: true, image: photo.iceCreamCone },
  { id: 'jalebi-rabri', categoryId: 'desserts', name: 'Jalebi with Rabri', description: 'Crisp hot jalebi, thickened sweet milk', price: 129, veg: true, spicy: false, available: true, image: photo.friedSweetsMalai },
  // Beverages
  { id: 'masala-chai', categoryId: 'beverages', name: 'Masala Chai', description: 'Ginger, cardamom, kadak kettle brew', price: 49, veg: true, spicy: false, available: true, image: photo.milkTeaCup },
  { id: 'filter-coffee', categoryId: 'beverages', name: 'Filter Coffee', description: 'South Indian davara-tumbler style', price: 59, veg: true, spicy: false, available: true, image: photo.milkTeaCup },
  { id: 'sweet-lassi', categoryId: 'beverages', name: 'Sweet Lassi', description: 'Thick Punjabi lassi, malai topping', price: 89, veg: true, spicy: false, available: true, image: photo.creamySpicedDrink },
  { id: 'mango-lassi', categoryId: 'beverages', name: 'Mango Lassi', description: 'Alphonso pulp, chilled yogurt', price: 109, veg: true, spicy: false, available: true, image: photo.mangoDrink, popular: true },
  { id: 'nimbu-soda', categoryId: 'beverages', name: 'Masala Nimbu Soda', description: 'Fresh lime, black salt, fizzy soda', price: 69, veg: true, spicy: false, available: true, image: photo.lemonadeGlasses },
  { id: 'chaas', categoryId: 'beverages', name: 'Masala Chaas', description: 'Spiced buttermilk, curry leaf tadka', price: 39, veg: true, spicy: false, available: true, image: photo.creamySpicedDrink },
]

/** Live menu — synced by MenuProvider from the API (never starts as fixtures). */
export const menuCategories: MenuCategory[] = []
export const menuItems: MenuItem[] = []

export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItems.find((i) => i.id === id)
}

export function getItemsByCategory(categoryId: string): MenuItem[] {
  return menuItems.filter((i) => i.categoryId === categoryId)
}

export function getCategoryById(id: string): MenuCategory | undefined {
  return menuCategories.find((c) => c.id === id)
}

/** Extra verified food photography (not tied to a dish) — e.g. hero/cover shots. */
export const restaurantInteriorPhoto = unsplash('1552566626-52f8b828add9')
export const chickenBiryaniPlatterPhoto = photo.chickenBiryaniLegs
