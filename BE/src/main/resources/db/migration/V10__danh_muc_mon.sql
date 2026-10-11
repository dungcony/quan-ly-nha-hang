-- Danh mục món do Quản lý quản lý (trước đây là enum cố định trong dishes.category).
CREATE TABLE categories (
    id         uuid PRIMARY KEY,
    name       varchar(100) NOT NULL,
    sort_order integer      NOT NULL,
    created_at timestamptz  NOT NULL,
    updated_at timestamptz  NOT NULL,
    CONSTRAINT ck_categories_sort_order CHECK (sort_order >= 0)
);

-- Tên danh mục duy nhất, không phân biệt hoa thường.
CREATE UNIQUE INDEX uq_categories_name ON categories (lower(name));

-- Bốn danh mục cũ giữ nguyên để chuyển dữ liệu món đã có.
INSERT INTO categories (id, name, sort_order, created_at, updated_at) VALUES
    ('00000000-0000-4000-8000-000000000001', 'Khai vị',     1, now(), now()),
    ('00000000-0000-4000-8000-000000000002', 'Món chính',   2, now(), now()),
    ('00000000-0000-4000-8000-000000000003', 'Đồ uống',     3, now(), now()),
    ('00000000-0000-4000-8000-000000000004', 'Tráng miệng', 4, now(), now());

ALTER TABLE dishes ADD COLUMN category_id uuid REFERENCES categories (id);

UPDATE dishes SET category_id = CASE category
    WHEN 'APPETIZER'   THEN '00000000-0000-4000-8000-000000000001'::uuid
    WHEN 'MAIN_COURSE' THEN '00000000-0000-4000-8000-000000000002'::uuid
    WHEN 'DRINK'       THEN '00000000-0000-4000-8000-000000000003'::uuid
    WHEN 'DESSERT'     THEN '00000000-0000-4000-8000-000000000004'::uuid
END;

ALTER TABLE dishes ALTER COLUMN category_id SET NOT NULL;

DROP INDEX uq_dishes_category_name;
DROP INDEX ix_dishes_status_category;
ALTER TABLE dishes DROP CONSTRAINT ck_dishes_category;
ALTER TABLE dishes DROP COLUMN category;

-- Tên món duy nhất trong cùng danh mục, không phân biệt hoa thường.
CREATE UNIQUE INDEX uq_dishes_category_name ON dishes (category_id, lower(name));
CREATE INDEX ix_dishes_status_category ON dishes (status, category_id);
