insert into public.inventory_items (barcode,item_name,category,karat,grams,status,sold_at) values
('B0001','18K Gold Ring','Ring','18K',4.520,'available',null),
('B0002','18K Gold Necklace','Necklace','18K',18.720,'available',null),
('B0003','21K Gold Bracelet','Bracelet','21K',12.450,'sold',now()),
('B0004','18K Gold Earrings','Earrings','18K',6.830,'available',null),
('B0005','24K Gold Pendant','Pendant','24K',9.210,'available',null)
on conflict (barcode) do nothing;

