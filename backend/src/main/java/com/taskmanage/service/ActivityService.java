package com.taskmanage.service;

import com.taskmanage.model.Activity;
import com.taskmanage.model.Project;
import com.taskmanage.model.Task;
import com.taskmanage.model.User;
import com.taskmanage.repository.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {
    @Autowired
    private ActivityRepository activityRepository;

    @Transactional
    public void logActivity(Project project, Task task, User user, String action, String details) {
        Activity activity = new Activity();
        activity.setProject(project);
        activity.setTask(task);
        activity.setUser(user);
        activity.setAction(action);
        activity.setDetails(details);
        activityRepository.save(activity);
    }
}
