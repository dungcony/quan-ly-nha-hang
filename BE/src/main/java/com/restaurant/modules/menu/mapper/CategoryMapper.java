package com.restaurant.modules.menu.mapper;

import com.restaurant.common.config.CommonMapperConfig;
import com.restaurant.modules.menu.dto.request.CategoryCreateRequest;
import com.restaurant.modules.menu.dto.request.CategoryUpdateRequest;
import com.restaurant.modules.menu.dto.response.CategoryResponse;
import com.restaurant.modules.menu.dto.response.MenuCategoryResponse;
import com.restaurant.modules.menu.entity.Category;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CommonMapperConfig.class)
public interface CategoryMapper {

    @Mapping(target = "id", source = "category.id")
    @Mapping(target = "name", source = "category.name")
    @Mapping(target = "sortOrder", source = "category.sortOrder")
    @Mapping(target = "dishCount", source = "dishCount")
    CategoryResponse toResponse(Category category, long dishCount);

    @Mapping(target = "id", source = "category.id")
    @Mapping(target = "name", source = "category.name")
    @Mapping(target = "sortOrder", source = "category.sortOrder")
    @Mapping(target = "dishCount", source = "dishCount")
    MenuCategoryResponse toMenuResponse(Category category, long dishCount);

    // id do service sinh, mốc thời gian do Hibernate gán
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "name", source = "name")
    @Mapping(target = "sortOrder", source = "sortOrder")
    Category fromCreateRequest(CategoryCreateRequest request);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "name", source = "name")
    @Mapping(target = "sortOrder", source = "sortOrder")
    void updateFromRequest(CategoryUpdateRequest request, @MappingTarget Category category);
}
