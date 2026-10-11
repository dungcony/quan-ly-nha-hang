package com.restaurant.modules.menu.mapper;

import com.restaurant.common.config.CommonMapperConfig;
import com.restaurant.modules.menu.dto.request.DishCreateRequest;
import com.restaurant.modules.menu.dto.request.DishUpdateRequest;
import com.restaurant.modules.menu.dto.response.DishDetailResponse;
import com.restaurant.modules.menu.dto.response.DishOrderingView;
import com.restaurant.modules.menu.dto.response.DishSummaryResponse;
import com.restaurant.modules.menu.entity.Dish;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CommonMapperConfig.class)
public interface DishMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    DishSummaryResponse toSummaryResponse(Dish dish);

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    DishDetailResponse toDetailResponse(Dish dish);

    DishOrderingView toOrderingView(Dish dish);

    // id do service sinh, danh mục do service nạp theo categoryId, ảnh tải riêng, mốc thời gian do Hibernate gán
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "name", source = "name")
    @Mapping(target = "price", source = "price")
    @Mapping(target = "unit", source = "unit")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "prepTimeMinutes", source = "prepTimeMinutes")
    @Mapping(target = "status", source = "status")
    Dish fromCreateRequest(DishCreateRequest request);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "name", source = "name")
    @Mapping(target = "price", source = "price")
    @Mapping(target = "unit", source = "unit")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "prepTimeMinutes", source = "prepTimeMinutes")
    @Mapping(target = "status", source = "status")
    void updateFromRequest(DishUpdateRequest request, @MappingTarget Dish dish);
}
