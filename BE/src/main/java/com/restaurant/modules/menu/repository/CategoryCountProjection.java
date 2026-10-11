package com.restaurant.modules.menu.repository;

import java.util.UUID;

/** Số món của một danh mục. */
public interface CategoryCountProjection {

    UUID getCategoryId();

    long getCount();
}
