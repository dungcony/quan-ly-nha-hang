# Thiết kế Thực thể, DTO & Biểu đồ lớp: Quản lý Món ăn & Thực đơn

Package `com.restaurant.modules.menu`. Quy ước chung: xem [`../README.md`](../README.md).

## 1. Lớp Thực thể (Entity)

### `Dish` (bảng `dishes`)

Kế thừa `AssignedIdEntity`. Xóa cứng, không `@SQLRestriction`.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `varchar(255)` | Bắt buộc |
| `category_id` | `uuid` | FK tới `categories(id)`; `@ManyToOne(LAZY)` cùng module |
| `price` | `bigint` | VND, `CHECK (price > 0)` |
| `unit` | `varchar(20)` | Đơn vị tính (Tô, Đĩa, Ly...) |
| `description` | `varchar(1000)` | Tùy chọn |
| `prep_time_minutes` | `integer` | Tùy chọn, `CHECK (prep_time_minutes > 0)` |
| `image_url` | `varchar(500)` | URL do `FileStorageService` trả về |
| `status` | `varchar(20)` | `DishStatus`; `CHECK` |
| `created_at`, `updated_at` | `timestamptz` | |

Index và ràng buộc:

- `uq_dishes_category_name`: `UNIQUE (category_id, lower(name))`.
- `ix_dishes_status_category`: `(status, category_id)` cho `/menu/dishes`.

Không dùng `@Version`: hai Quản lý sửa cùng lúc là hiếm, giá trị cuối thắng.

### `Category` (bảng `categories`)

Kế thừa `AssignedIdEntity`. Xóa cứng, chỉ khi không còn món (`CategoryValidator.validateDeletable`).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `varchar(100)` | Bắt buộc, duy nhất không phân biệt hoa thường (`uq_categories_name`) |
| `sort_order` | `integer` | Thứ tự hiển thị, `CHECK (sort_order >= 0)` |
| `created_at`, `updated_at` | `timestamptz` | |

Bốn danh mục mặc định (Khai vị, Món chính, Đồ uống, Tráng miệng) được nạp bởi migration chuyển từ enum cũ.

## 2. Data Transfer Object (DTO)

### Request (`dto/request/`)

| DTO | Trường | Validate |
|---|---|---|
| `DishSearchRequest` (query param) | `name` | Tùy chọn, tìm theo chuỗi con |
| | `categoryId` | Tùy chọn, `UUID` (query `category_id`) |
| | `minPrice`, `maxPrice` | Tùy chọn, `@PositiveOrZero`; `minPrice ≤ maxPrice` kiểm ở service |
| | `status` | Tùy chọn, `DishStatus`; `/menu/dishes` từ chối `DISCONTINUED` |
| `DishCreateRequest` | `name` | `@NotBlank @Size(max = 255)` |
| | `categoryId` | `@NotNull` |
| | `price` | `@NotNull @Positive` |
| | `unit` | `@NotBlank @Size(max = 20)` |
| | `description` | `@Size(max = 1000)` |
| | `prepTimeMinutes` | `@Positive`, tùy chọn |
| | `status` | `@NotNull` |
| `DishUpdateRequest` | Như `DishCreateRequest` | Hai DTO tách nhau dù trùng trường (rule 2.4) để sau này khác nhau không ảnh hưởng nhau |
| `CategoryCreateRequest` | `name` | `@NotBlank @Size(max = 100)` |
| | `sortOrder` | `@NotNull @PositiveOrZero` |
| `CategoryUpdateRequest` | Như `CategoryCreateRequest` | Tách riêng theo rule 2.4 |

`price` kiểu `Long`. Ảnh không nằm trong request JSON mà qua `PUT /dishes/{id}/image`. Trùng tên trong danh mục kiểm tra ở
`DishValidator`.

### Response (`dto/response/`)

| DTO | Trường |
|---|---|
| `DishSummaryResponse` | `id`, `name`, `categoryId`, `categoryName`, `price`, `unit`, `imageUrl`, `status` |
| `DishDetailResponse` | `id`, `name`, `categoryId`, `categoryName`, `price`, `unit`, `description`, `prepTimeMinutes`, `imageUrl`, `status`, `createdAt`, `updatedAt` |
| `MenuCategoryResponse` | `id`, `name`, `sortOrder`, `dishCount` (số món `AVAILABLE`/`OUT_OF_STOCK`) |
| `CategoryResponse` | `id`, `name`, `sortOrder`, `dishCount` (số món ở mọi trạng thái) |
| `DishOrderingView` | `id`, `name`, `price`, `status` (record nội bộ cho `ordering`, không có endpoint) |

## 3. Biểu đồ Lớp (Class Diagram)

Mũi tên nét đứt từ service là phụ thuộc của lớp `*ServiceImpl` tương ứng.

```mermaid
classDiagram
    class MenuController {
        +listCategories() ApiResponse~List~MenuCategoryResponse~~
        +searchDishes(DishSearchRequest, page, pageSize, sortBy, sortOrder) ApiResponse~PageResponse~DishSummaryResponse~~
        +getDish(UUID id) ApiResponse~DishDetailResponse~
    }

    class DishController {
        +searchDishes(DishSearchRequest, page, pageSize, sortBy, sortOrder) ApiResponse~PageResponse~DishSummaryResponse~~
        +getDish(UUID id) ApiResponse~DishDetailResponse~
        +createDish(DishCreateRequest) ApiResponse~DishDetailResponse~
        +updateDish(UUID id, DishUpdateRequest) ApiResponse~DishDetailResponse~
        +updateDishImage(UUID id, MultipartFile) ApiResponse~DishDetailResponse~
        +deleteDish(UUID id) ApiResponse~Void~
    }

    class DishService {
        <<interface>>
        +searchVisibleDishes(DishSearchRequest, PageRequestParams) Page~DishSummaryResponse~
        +getVisibleDish(UUID id) DishDetailResponse
        +searchDishes(DishSearchRequest, PageRequestParams) Page~DishSummaryResponse~
        +getDish(UUID id) DishDetailResponse
        +createDish(DishCreateRequest) DishDetailResponse
        +updateDish(UUID id, DishUpdateRequest) DishDetailResponse
        +updateDishImage(UUID id, MultipartFile) DishDetailResponse
        +deleteDish(UUID id) void
        +getDishesForOrdering(Collection~UUID~ ids) List~DishOrderingView~
    }

    class DishValidator {
        +validateNameUnique(UUID categoryId, String name, UUID excludeId) void
        +validatePriceRange(Long min, Long max) void
        +validateDeletable(UUID id) void
    }

    class DishDeletionGuard {
        <<interface>>
        +isUsed(UUID dishId) boolean
    }

    class DishRepository {
        <<interface>>
        +findAll(Specification~Dish~, Pageable) Page~Dish~
        +existsByCategoryIdAndNameIgnoreCaseAndIdNot(UUID, String, UUID) boolean
        +existsByCategoryId(UUID) boolean
        +countVisibleByCategory(Collection~DishStatus~) List~CategoryCount~
        +countAllByCategory() List~CategoryCount~
    }

    class DishMapper {
        <<interface>>
        +toSummaryResponse(Dish) DishSummaryResponse
        +toDetailResponse(Dish) DishDetailResponse
        +toOrderingView(Dish) DishOrderingView
        +toEntity(DishCreateRequest) Dish
        +updateEntity(DishUpdateRequest, Dish) void
    }

    class CategoryController {
        +listCategories() ApiResponse~List~CategoryResponse~~
        +createCategory(CategoryCreateRequest) ApiResponse~CategoryResponse~
        +updateCategory(UUID id, CategoryUpdateRequest) ApiResponse~CategoryResponse~
        +deleteCategory(UUID id) ApiResponse~Void~
    }

    class CategoryService {
        <<interface>>
        +listMenuCategories() List~MenuCategoryResponse~
        +listCategories() List~CategoryResponse~
        +createCategory(CategoryCreateRequest) CategoryResponse
        +updateCategory(UUID id, CategoryUpdateRequest) CategoryResponse
        +deleteCategory(UUID id) void
    }

    class CategoryValidator {
        +validateNameUnique(String name, UUID excludeId) void
        +validateDeletable(UUID id) void
    }

    class FileStorageService {
        <<interface>>
    }

    MenuController --> DishService
    MenuController --> CategoryService
    CategoryController --> CategoryService
    DishController --> DishService
    DishService ..> DishRepository
    DishService ..> DishValidator
    DishService ..> DishMapper
    DishService ..> FileStorageService
    DishValidator ..> DishRepository
    DishValidator ..> DishDeletionGuard
    CategoryService ..> CategoryValidator
    CategoryValidator ..> DishRepository
```

Ghi chú:

- `searchVisibleDishes`, `getVisibleDish` (`DishService`) và `listMenuCategories` (`CategoryService`) dành cho `MenuController` công khai và luôn lọc `status IN (AVAILABLE, OUT_OF_STOCK)`;
  `searchDishes`, `getDish` dành cho Quản lý, thấy mọi trạng thái.
- `DishDeletionGuard` do `menu` định nghĩa, `order` implement (`OrderDishDeletionGuard`: tồn tại `order_items` với `dish_id`). Hóa đơn
  luôn có đơn tương ứng nên không cần guard riêng của `billing`.
- `unitPrice` của dòng món là ảnh chụp từ `DishOrderingView.price` lúc gửi bếp, nên sửa giá món không đụng đơn đang mở.
- `getDishesForOrdering` chỉ đọc, `@Transactional(readOnly = true)`.
