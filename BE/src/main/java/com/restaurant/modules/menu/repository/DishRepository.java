package com.restaurant.modules.menu.repository;

import com.restaurant.modules.menu.entity.Dish;
import com.restaurant.modules.menu.enums.DishStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface DishRepository extends JpaRepository<Dish, UUID>, JpaSpecificationExecutor<Dish> {

    boolean existsByCategoryIdAndNameIgnoreCase(UUID categoryId, String name);

    boolean existsByCategoryIdAndNameIgnoreCaseAndIdNot(UUID categoryId, String name, UUID id);

    boolean existsByCategoryId(UUID categoryId);

    long countByCategoryId(UUID categoryId);

    /** Nạp sẵn danh mục để danh sách món không phát sinh thêm truy vấn cho từng dòng. */
    @Override
    @EntityGraph(attributePaths = "category")
    Page<Dish> findAll(Specification<Dish> spec, Pageable pageable);

    /** Số món theo danh mục, chỉ tính các món có trạng thái trong {@code statuses}; danh mục không có món không xuất hiện. */
    @Query("select d.category.id as categoryId, count(d) as count from Dish d where d.status in :statuses group by d.category.id")
    List<CategoryCountProjection> countVisibleByCategory(@Param("statuses") Collection<DishStatus> statuses);

    /** Số món theo danh mục, mọi trạng thái; danh mục không có món không xuất hiện. */
    @Query("select d.category.id as categoryId, count(d) as count from Dish d group by d.category.id")
    List<CategoryCountProjection> countAllByCategory();
}
