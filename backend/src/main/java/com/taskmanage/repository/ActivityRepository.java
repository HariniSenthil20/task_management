package com.taskmanage.repository;

import com.taskmanage.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Activity> findTop50ByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Activity> findByTaskId(Long taskId);
}
