package com.restaurant.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

/**
 * Tự động kiểm tra các quy tắc kiến trúc của {@code .agents/spring-boot_struct.md} mỗi lần {@code mvn test}.
 * Module nghiệp vụ nằm dưới {@code <BASE_PACKAGE>.modules.<module>}; hướng phụ thuộc cho phép xem
 * {@code docs/design/README.md} mục 1.
 */
@AnalyzeClasses(packages = ArchitectureTest.BASE_PACKAGE, importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    // Đổi một chỗ này khi đổi package gốc sang com.restaurant.
    static final String BASE_PACKAGE = "com.restaurant";

    private static final String MODULES_PACKAGE = BASE_PACKAGE + ".modules";

    private static final List<String> MODULES = List.of("user", "menu", "table", "reservation", "order", "billing");

    // Rule 2.2: module khác chỉ được gọi qua Service interface, không import repository hay entity của nhau.
    @ArchTest
    static final ArchRule modules_do_not_import_repository_or_entity_of_other_modules = classes()
            .that().resideInAnyPackage(modulePackages())
            .should(new ArchCondition<>("not depend on the repository or entity package of another module") {
                @Override
                public void check(JavaClass item, ConditionEvents events) {
                    String own = moduleOf(item.getPackageName());
                    item.getDirectDependenciesFromSelf().forEach(dep -> {
                        String target = dep.getTargetClass().getPackageName();
                        String targetModule = moduleOf(target);
                        if (targetModule != null && !targetModule.equals(own)
                                && (target.contains(".repository") || target.contains(".entity"))) {
                            events.add(SimpleConditionEvent.violated(dep, dep.getDescription()));
                        }
                    });
                }
            })
            .allowEmptyShould(true);

    // Rule 2.2: không có vòng phụ thuộc giữa các module.
    @ArchTest
    static final ArchRule modules_are_free_of_cycles = slices()
            .matching(MODULES_PACKAGE + ".(*)..")
            .should().beFreeOfCycles()
            .allowEmptyShould(true);

    // Hướng phụ thuộc đã duyệt: chặn xoá xuyên module đi qua "guard" do module sở hữu dữ liệu định nghĩa,
    // nên các module nền không bao giờ được gọi ngược lên module phía trên.
    @ArchTest
    static final ArchRule base_modules_do_not_depend_on_upper_modules = noClasses()
            .that().resideInAnyPackage(modulePackage("user"), modulePackage("menu"), modulePackage("table"))
            .should().dependOnClassesThat().resideInAnyPackage(
                    modulePackage("reservation"), modulePackage("order"), modulePackage("billing"))
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule order_does_not_depend_on_reservation_or_billing = noClasses()
            .that().resideInAPackage(modulePackage("order"))
            .should().dependOnClassesThat().resideInAnyPackage(modulePackage("reservation"), modulePackage("billing"))
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule reservation_does_not_depend_on_billing = noClasses()
            .that().resideInAPackage(modulePackage("reservation"))
            .should().dependOnClassesThat().resideInAPackage(modulePackage("billing"))
            .allowEmptyShould(true);

    // common là hạ tầng dùng chung, không được biết tới module nghiệp vụ nào.
    @ArchTest
    static final ArchRule common_does_not_depend_on_business_modules = noClasses()
            .that().resideInAPackage(BASE_PACKAGE + ".common..")
            .should().dependOnClassesThat().resideInAnyPackage(modulePackages())
            .allowEmptyShould(true);

    // Rule 2.3: không dùng quan hệ ORM xuyên module; xuyên module chỉ lưu id thuần. Trong cùng module chỉ cho
    // @ManyToOne (vd Dish -> Category); @OneToMany, @OneToOne, @ManyToMany vẫn bị cấm ở mọi trường hợp.
    @ArchTest
    static final ArchRule entities_do_not_use_orm_relations_across_modules = fields()
            .that().areDeclaredInClassesThat().areAnnotatedWith(Entity.class)
            .should(new ArchCondition<>("not use @OneToMany, @OneToOne, @ManyToMany, or @ManyToOne to another module") {
                @Override
                public void check(JavaField field, ConditionEvents events) {
                    if (field.isAnnotatedWith(OneToMany.class) || field.isAnnotatedWith(OneToOne.class)
                            || field.isAnnotatedWith(ManyToMany.class)) {
                        events.add(SimpleConditionEvent.violated(field, field.getDescription() + " uses a forbidden ORM relation"));
                        return;
                    }
                    if (field.isAnnotatedWith(ManyToOne.class)) {
                        String own = moduleOf(field.getOwner().getPackageName());
                        String target = moduleOf(field.getRawType().getPackageName());
                        if (own == null || !own.equals(target)) {
                            events.add(SimpleConditionEvent.violated(field, field.getDescription() + " is a @ManyToOne across modules"));
                        }
                    }
                }
            })
            .allowEmptyShould(true);

    // Rule 2.3: enum trong entity luôn lưu dạng chuỗi, tránh ánh xạ sai khi đổi thứ tự enum.
    @ArchTest
    static final ArchRule enum_fields_in_entities_are_stored_as_string = fields()
            .that().areDeclaredInClassesThat().areAnnotatedWith(Entity.class)
            .and(new DescribedPredicate<JavaField>("have an enum type") {
                @Override
                public boolean test(JavaField field) {
                    return field.getRawType().isEnum();
                }
            })
            .should(new ArchCondition<>("be annotated with @Enumerated(EnumType.STRING)") {
                @Override
                public void check(JavaField field, ConditionEvents events) {
                    boolean ok = field.tryGetAnnotationOfType(Enumerated.class)
                            .map(a -> a.value() == EnumType.STRING).orElse(false);
                    if (!ok) {
                        events.add(SimpleConditionEvent.violated(field, field.getDescription() + " is not @Enumerated(STRING)"));
                    }
                }
            })
            .allowEmptyShould(true);

    // Rule 2.5: @Transactional của module nghiệp vụ chỉ đặt ở method của *ServiceImpl. Class hạ tầng trong common
    // nằm ngoài phạm vi luật này.
    @ArchTest
    static final ArchRule transactional_methods_belong_to_service_impl = methods()
            .that().areAnnotatedWith(Transactional.class)
            .and().areDeclaredInClassesThat().resideInAnyPackage(modulePackages())
            .should().beDeclaredInClassesThat().resideInAPackage("..service.impl..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule service_impl_is_not_transactional_at_class_level = classes()
            .that().resideInAPackage("..service.impl..")
            .and().resideInAnyPackage(modulePackages())
            .should().notBeAnnotatedWith(Transactional.class)
            .allowEmptyShould(true);

    // Controller không truy cập Repository, không chứa nghiệp vụ.
    @ArchTest
    static final ArchRule controllers_do_not_touch_repositories_or_entities = noClasses()
            .that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAnyPackage("..repository..", "..entity..")
            .allowEmptyShould(true);

    // Mọi truy cập dữ liệu đi qua Service: controller chỉ gọi interface, không gọi thẳng *ServiceImpl.
    @ArchTest
    static final ArchRule controllers_depend_on_service_interfaces_only = noClasses()
            .that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAPackage("..service.impl..")
            .allowEmptyShould(true);

    // Rule 2.6: tầng DTO không truy vấn dữ liệu.
    @ArchTest
    static final ArchRule dtos_do_not_depend_on_repositories_or_services = noClasses()
            .that().resideInAPackage("..dto..")
            .should().dependOnClassesThat().resideInAnyPackage("..repository..", "..service..", "..entity..")
            .allowEmptyShould(true);

    // Rule 2.12: không throw RuntimeException trần trong service; lỗi nghiệp vụ đi qua BusinessException.
    @ArchTest
    static final ArchRule services_do_not_throw_raw_runtime_exceptions = noClasses()
            .that().resideInAPackage("..service.impl..")
            .should().callConstructor(RuntimeException.class)
            .allowEmptyShould(true);

    // Rule 2.12: không @ExceptionHandler riêng lẻ trong controller.
    @ArchTest
    static final ArchRule controllers_have_no_exception_handlers = methods()
            .that().areDeclaredInClassesThat().resideInAPackage("..controller..")
            .should().notBeAnnotatedWith(org.springframework.web.bind.annotation.ExceptionHandler.class)
            .allowEmptyShould(true);

    private static String modulePackage(String module) {
        return MODULES_PACKAGE + "." + module + "..";
    }

    private static String[] modulePackages() {
        return MODULES.stream().map(ArchitectureTest::modulePackage).toArray(String[]::new);
    }

    private static String moduleOf(String packageName) {
        for (String module : MODULES) {
            String prefix = MODULES_PACKAGE + "." + module;
            if (packageName.equals(prefix) || packageName.startsWith(prefix + ".")) {
                return module;
            }
        }
        return null;
    }
}
