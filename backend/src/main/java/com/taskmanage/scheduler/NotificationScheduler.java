package com.taskmanage.scheduler;

import com.taskmanage.model.Task;
import com.taskmanage.model.enums.TaskStatus;
import com.taskmanage.repository.TaskRepository;
import com.taskmanage.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
public class NotificationScheduler {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private NotificationService notificationService;

    // Run every hour to check for approaching due dates
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void checkDueDates() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        
        List<Task> tasks = taskRepository.findAll();
        for (Task task : tasks) {
            if (task.getStatus() != TaskStatus.COMPLETED && task.getDueDate() != null) {
                if (task.getDueDate().equals(tomorrow)) {
                    if (task.getAssignee() != null) {
                        notificationService.createNotification(
                            task.getAssignee(),
                            "Due Date Approaching",
                            "Task '" + task.getTitle() + "' is due tomorrow."
                        );
                    }
                }
            }
        }
    }
}
