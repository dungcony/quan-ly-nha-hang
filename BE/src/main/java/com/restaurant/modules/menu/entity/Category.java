package com.restaurant.modules.menu.entity;

import com.restaurant.common.abstracts.AssignedIdEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Danh mục món (bảng {@code categories}); {@code sortOrder} nhỏ hơn thì hiển thị trước. */
@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
public class Category extends AssignedIdEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
