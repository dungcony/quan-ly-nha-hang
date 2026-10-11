package com.restaurant.modules.menu.entity;

import com.restaurant.common.abstracts.AssignedIdEntity;
import com.restaurant.modules.menu.enums.DishStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Món ăn của thực đơn (bảng {@code dishes}). Giá tính bằng VND, số nguyên. */
@Entity
@Table(name = "dishes")
@Getter
@Setter
@NoArgsConstructor
public class Dish extends AssignedIdEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private long price;

    @Column(nullable = false)
    private String unit;

    private String description;

    @Column(name = "prep_time_minutes")
    private Integer prepTimeMinutes;

    @Column(name = "image_url")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DishStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
