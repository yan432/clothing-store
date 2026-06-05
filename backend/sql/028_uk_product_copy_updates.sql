-- Product-level Ukrainian copy refinements for the storefront.
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_uk text;

UPDATE products SET
  description_uk = 'Deconstructed джинси washed-black денім.',
  product_details_uk = 'Вільна oversized посадка, унісекс. Середня посадка. Шість кишень. Застібка-блискавка YKK. Шльовки на поясі. Якісні шви ззовні й зсередини. Stone-wash обробка. Металева фурнітура з нержавіючої сталі на кишенях.'
WHERE slug = 'deconstructed-washed-jeans';

UPDATE products SET
  name_uk = 'Модульний лонгслів EDM чорний',
  description_uk = 'Модульний лонгслів EDM чорного кольору. Лонгслів із відстібними рукавами, завдяки чому можна носити його як футболку або лонгслів.',
  product_details_uk = 'Оверсайз посадка, унісекс. Шовкотрафаретний принт спереду.
М’яка щільна тканина високої якості.'
WHERE slug = 'edm-module-longsleeve-black';

UPDATE products SET
  name_uk = 'Модульний лонгслів EDM молочний',
  description_uk = 'Модульний лонгслів EDM молочного кольору. Лонгслів із відстібними рукавами, завдяки чому можна носити його як футболку або лонгслів.',
  product_details_uk = 'Оверсайз посадка, унісекс. Шовкотрафаретний принт спереду.
М’яка щільна тканина високої якості.'
WHERE slug = 'edm-module-longsleeve-milk';

UPDATE products SET
  name_uk = 'Модульний лонгслів EDM ментоловий',
  description_uk = 'Модульний лонгслів EDM ментолового кольору. Лонгслів із відстібними рукавами, завдяки чому можна носити його як футболку або лонгслів.',
  product_details_uk = 'Оверсайз посадка, унісекс. Шовкотрафаретний принт спереду.
М’яка щільна тканина високої якості.'
WHERE slug = 'edm-module-longsleeve-mentol';

UPDATE products SET
  name_uk = 'Брюки вільного крою',
  description_uk = 'Вільні брюки чорного кольору.',
  product_details_uk = 'Вільна oversized посадка, унісекс. Середня посадка. Застібка-блискавка YKK. Шльовки на поясі. Якісні шви.'
WHERE slug = 'loose-fit-pants';

UPDATE products SET
  name_uk = 'Худі Scars',
  description_uk = 'Худі Scars з washed-black деніму.',
  product_details_uk = 'Злегка оверсайз посадка, унісекс. Передня кишеня, повнорозмірна блискавка YKK, якісні шви ззовні й зсередини, stone-wash обробка та металева фурнітура з нержавіючої сталі.'
WHERE slug = 'scars-hoodie';

UPDATE products SET
  description_uk = 'EDM washed худі у сірому кольорі.',
  material_care_uk = 'Матеріал: 100% бавовняний трикотаж French terry, 360 г/см2.

Догляд:

Машинне прання в холодній воді з подібними кольорами.
Прати навиворіт, щоб захистити тканину та принт.
Використовувати делікатний режим прання.
Не відбілювати.
Не сушити в сушильній машині.
Сушити навиворіт.
Не викручувати сильно.
Не замочувати надовго.
За потреби прасувати теплою праскою.
Не прасувати принти, вишивку або декоративні елементи.
Не віддавати в хімчистку.
Через натуральну структуру бавовни можлива легка усадка після першого прання.',
  product_details_uk = 'Оверсайз посадка, унісекс. Передня кишеня. Рібана на манжетах і по низу. Якісні шви. Вишитий напис у tribal-стилі білим кольором.'
WHERE slug = 'edm-washed-hoodie';

UPDATE products SET
  name_uk = 'Bermuda карго-шорти',
  description_uk = 'Bermuda карго-шорти чорного кольору.'
WHERE slug = 'cargo-bermuda-shorts';

UPDATE products SET
  name_uk = 'Бомбер Riot',
  product_details_uk = 'Оверсайз посадка, унісекс. Комфортно носити від -10°C до +15°C. Якісні шви ззовні та зсередини. Застібка-блискавка YKK. Фурнітура з нержавіючої сталі.'
WHERE slug = 'riot-bomber';

UPDATE products SET
  name_uk = 'Шорти Bermuda',
  description_uk = 'Шорти Bermuda чорного кольору.'
WHERE slug = 'bermuda-shorts';
