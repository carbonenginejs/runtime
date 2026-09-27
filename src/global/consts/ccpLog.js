// Source: core/include/CcpLog.h

/** Carbon log severity in increasing order, including native aliases and sentinel. */
export const LogType = {
    LOGTYPE_INFO: 0,
    LOGTYPE_NOTICE: 1,
    LOGTYPE_WARN: 2,
    LOGTYPE_ERR: 3,
    LOGTYPE_COUNT: 4,
    LOGTYPE_LOWEST: 0,
    LOGTYPE_HIGHEST: 3
};

/** Whether an echo observes the per-severity privileged-only flag. */
export const LogEchoPrivilege = {
    LOG_ECHO_REQUIRES_PRIVILEGE_CHECK: 0,
    LOG_ECHO_NO_PRIVILEGE_CHECK: 1
};
